import { getRedis } from '../config/redis.js';

const AUCTION_STATE_PREFIX = 'auction:';
const AUCTION_LOCK_PREFIX = 'auction:';
const AUCTION_SEQUENCE_PREFIX = 'auction:';
const IDEMPOTENCY_PREFIX = 'idempotency:';

export interface AuctionLiveState {
  currentPrice: number;
  highBidderId: string | null;
  bidCount: number;
  endTime: string;
  status: string;
  extensionCount: number;
}

export function auctionStateKey(auctionId: string): string {
  return `${AUCTION_STATE_PREFIX}${auctionId}:state`;
}

export function auctionLockKey(auctionId: string): string {
  return `${AUCTION_LOCK_PREFIX}${auctionId}:lock`;
}

export function auctionSequenceKey(auctionId: string): string {
  return `${AUCTION_SEQUENCE_PREFIX}${auctionId}:sequence`;
}

export function idempotencyKey(key: string): string {
  return `${IDEMPOTENCY_PREFIX}${key}`;
}

/** Redis stores endTime as epoch ms string; Lua script requires numeric ms. */
export function endTimeToRedisMs(endTime: string | Date | number): string {
  if (typeof endTime === 'number') return Math.floor(endTime).toString();
  if (endTime instanceof Date) return endTime.getTime().toString();
  if (/^\d+$/.test(endTime)) return endTime;
  return new Date(endTime).getTime().toString();
}

/** Convert Redis endTime (ms string or legacy ISO) to ISO for API responses. */
export function endTimeFromRedis(value: string): string {
  if (/^\d+$/.test(value)) {
    return new Date(Number(value)).toISOString();
  }
  return value;
}

export async function ensureRedisEndTimeMs(auctionId: string): Promise<void> {
  const redis = getRedis();
  const endTime = await redis.hget(auctionStateKey(auctionId), 'endTime');
  if (!endTime || !/^\d+$/.test(endTime)) {
    const ms = endTime ? new Date(endTime).getTime() : Date.now();
    await redis.hset(auctionStateKey(auctionId), 'endTime', ms.toString());
  }
}

export async function initAuctionState(
  auctionId: string,
  state: AuctionLiveState
): Promise<void> {
  const redis = getRedis();
  await redis.hset(auctionStateKey(auctionId), {
    currentPrice: state.currentPrice.toString(),
    highBidderId: state.highBidderId ?? '',
    bidCount: state.bidCount.toString(),
    endTime: endTimeToRedisMs(state.endTime),
    status: state.status,
    extensionCount: state.extensionCount.toString(),
  });
  await redis.set(auctionSequenceKey(auctionId), '0');
}

export async function getAuctionState(auctionId: string): Promise<AuctionLiveState | null> {
  const redis = getRedis();
  const data = await redis.hgetall(auctionStateKey(auctionId));
  if (!data || Object.keys(data).length === 0) return null;

  return {
    currentPrice: Number(data.currentPrice),
    highBidderId: data.highBidderId || null,
    bidCount: Number(data.bidCount),
    endTime: endTimeFromRedis(data.endTime),
    status: data.status,
    extensionCount: Number(data.extensionCount ?? 0),
  };
}

export async function deleteAuctionState(auctionId: string): Promise<void> {
  const redis = getRedis();
  await redis.del(
    auctionStateKey(auctionId),
    auctionLockKey(auctionId),
    auctionSequenceKey(auctionId)
  );
}

export const CACHE_LIVE_AUCTIONS = 'cache:auctions:live';
export const CACHE_AUCTION_PREFIX = 'cache:auction:';

export async function invalidateAuctionCache(auctionId: string): Promise<void> {
  const redis = getRedis();
  await redis.del(CACHE_LIVE_AUCTIONS, `${CACHE_AUCTION_PREFIX}${auctionId}`);
}

const ACCEPT_BID_LUA = `
local stateKey = KEYS[1]
local seqKey = KEYS[2]
local lockKey = KEYS[3]

local amount = tonumber(ARGV[1])
local minIncrement = tonumber(ARGV[2])
local userId = ARGV[3]
local nowMs = tonumber(ARGV[4])
local extensionThresholdMs = tonumber(ARGV[5])
local extensionSec = tonumber(ARGV[6])
local maxExtensions = tonumber(ARGV[7])
local buyNowPrice = tonumber(ARGV[8])

local state = redis.call('HGETALL', stateKey)
if #state == 0 then
  return cjson.encode({ ok = false, code = 'AUCTION_NOT_LIVE', message = 'Auction state not found' })
end

local map = {}
for i = 1, #state, 2 do
  map[state[i]] = state[i + 1]
end

if map.status ~= 'live' then
  return cjson.encode({ ok = false, code = 'AUCTION_NOT_LIVE', message = 'Auction is not live' })
end

local endTimeMs = tonumber(map.endTime)
if nowMs >= endTimeMs then
  return cjson.encode({ ok = false, code = 'AUCTION_ENDED', message = 'Auction has ended' })
end

local currentPrice = tonumber(map.currentPrice)
local minRequired = currentPrice + minIncrement
if amount < minRequired then
  return cjson.encode({ ok = false, code = 'BID_TOO_LOW', message = 'Bid amount too low', details = { minRequired = minRequired } })
end

local extensionCount = tonumber(map.extensionCount or '0')
local newEndTime = endTimeMs
local extended = false

if (endTimeMs - nowMs) <= extensionThresholdMs then
  if maxExtensions > 0 and extensionCount >= maxExtensions then
    -- no extension
  else
    newEndTime = endTimeMs + (extensionSec * 1000)
    extensionCount = extensionCount + 1
    extended = true
  end
end

local bidCount = tonumber(map.bidCount) + 1
local sequence = redis.call('INCR', seqKey)

redis.call('HSET', stateKey,
  'currentPrice', amount,
  'highBidderId', userId,
  'bidCount', bidCount,
  'endTime', newEndTime,
  'extensionCount', extensionCount
)

local buyNow = false
if buyNowPrice > 0 and amount >= buyNowPrice then
  buyNow = true
end

return cjson.encode({
  ok = true,
  amount = amount,
  bidSequence = sequence,
  bidCount = bidCount,
  highBidderId = userId,
  endTime = newEndTime,
  extended = extended,
  extensionCount = extensionCount,
  buyNow = buyNow
})
`;

export interface AcceptBidResult {
  ok: boolean;
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
  amount?: number;
  bidSequence?: number;
  bidCount?: number;
  highBidderId?: string;
  endTime?: number;
  extended?: boolean;
  extensionCount?: number;
  buyNow?: boolean;
}

export async function acceptBidAtomic(
  auctionId: string,
  params: {
    amount: number;
    minIncrement: number;
    userId: string;
    extensionThresholdSec: number;
    softCloseExtensionSec: number;
    maxExtensions?: number;
    buyNowPrice?: number;
  }
): Promise<AcceptBidResult> {
  const redis = getRedis();
  await ensureRedisEndTimeMs(auctionId);

  const lockKey = auctionLockKey(auctionId);
  const acquired = await redis.set(lockKey, '1', 'EX', 2, 'NX');
  if (!acquired) {
    return { ok: false, code: 'BID_CONTENTION', message: 'Bid in progress, try again' };
  }

  try {
    const nowMs = Date.now();
    const result = await redis.eval(
      ACCEPT_BID_LUA,
      3,
      auctionStateKey(auctionId),
      auctionSequenceKey(auctionId),
      lockKey,
      params.amount.toString(),
      params.minIncrement.toString(),
      params.userId,
      nowMs.toString(),
      (params.extensionThresholdSec * 1000).toString(),
      params.softCloseExtensionSec.toString(),
      (params.maxExtensions ?? 0).toString(),
      (params.buyNowPrice ?? 0).toString()
    );

    if (typeof result !== 'string') {
      return { ok: false, code: 'BID_REJECTED', message: 'Unexpected Redis response' };
    }

    return JSON.parse(result) as AcceptBidResult;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Redis bid script failed';
    return { ok: false, code: 'BID_REJECTED', message };
  } finally {
    await redis.del(lockKey);
  }
}

export async function getIdempotencyResponse(key: string): Promise<string | null> {
  return getRedis().get(idempotencyKey(key));
}

export async function setIdempotencyResponse(key: string, response: string): Promise<void> {
  await getRedis().set(idempotencyKey(key), response, 'EX', 86400);
}
