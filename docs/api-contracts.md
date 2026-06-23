# API Contracts

Base URL: `http://localhost:3001/v1` (development)

Production: `https://<api-host>/v1`

All authenticated routes require:

```http
Authorization: Bearer <accessToken>
```

JSON request/response bodies unless noted. Prices are **integer cents** (`1200000` = $12,000.00).

---

## Response Envelope

### Success

```json
{
  "success": true,
  "data": { }
}
```

Paginated lists:

```json
{
  "success": true,
  "data": [ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "BID_TOO_LOW",
    "message": "Bid must be at least $12,500.00"
  }
}
```

Common HTTP status codes: `400` validation, `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict, `429` rate limited, `500` internal.

---

## Health & Metrics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Liveness |
| GET | `/health/ready` | — | MongoDB + Redis connectivity |
| GET | `/metrics` | — | Prometheus text format |
| GET | `/v1` | — | API name and version |

---

## Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Create bidder account |
| POST | `/auth/login` | — | Returns access + refresh tokens |
| POST | `/auth/refresh` | refresh token | Rotate tokens |
| POST | `/auth/logout` | JWT | Invalidate refresh token |
| GET | `/auth/me` | JWT | Current user profile |

### POST `/auth/register`

```json
{
  "email": "user@example.com",
  "password": "SecurePass1!",
  "displayName": "Alex Rider"
}
```

### POST `/auth/login`

```json
{
  "email": "user@example.com",
  "password": "SecurePass1!"
}
```

Response `data`:

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "displayName": "Alex Rider",
    "role": "bidder"
  }
}
```

---

## Auctions (Public)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/auctions` | optional | List auctions |
| GET | `/auctions/live` | optional | Live auctions (cached) |
| GET | `/auctions/:id` | optional | Detail + live Redis state |
| GET | `/auctions/:id/bids` | optional | Paginated bid history |
| POST | `/auctions/:id/bids` | JWT | Place bid |

### GET `/auctions` query params

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | `draft`, `scheduled`, `live`, `ended`, `cancelled` |
| `make` | string | Filter by motorcycle make |
| `page` | number | Default `1` |
| `limit` | number | Default `20`, max `100` |

### POST `/auctions/:id/bids`

Headers:

```http
Idempotency-Key: <uuid>   # optional, recommended
```

Body:

```json
{
  "amount": 1250000
}
```

Success `201`:

```json
{
  "success": true,
  "data": {
    "bidId": "...",
    "amount": 1250000,
    "auctionId": "...",
    "createdAt": "2025-06-23T12:00:00.000Z"
  }
}
```

**Bid error codes:**

| Code | HTTP | Meaning |
|------|------|---------|
| `AUCTION_NOT_LIVE` | 400 | Auction not in live state |
| `AUCTION_ENDED` | 400 | Auction already ended |
| `BID_TOO_LOW` | 400 | Below minimum increment |
| `SELF_BID_NOT_ALLOWED` | 400 | Already highest bidder |
| `RATE_LIMITED` | 429 | Too many bids in window |
| `INVALID_AMOUNT` | 400 | Amount validation failed |

---

## Admin (`admin` role required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/dashboard` | KPIs |
| GET | `/admin/auctions` | All auctions |
| POST | `/admin/motorcycles` | Create motorcycle |
| POST | `/admin/auctions` | Create auction |
| PATCH | `/admin/auctions/:id` | Update auction |
| POST | `/admin/auctions/:id/force-end` | End live auction immediately |
| POST | `/admin/auctions/:id/cancel` | Cancel draft/scheduled |
| GET | `/admin/users` | List users |
| PATCH | `/admin/users/:id` | Update user role/status |
| GET | `/admin/audit-logs` | Audit trail |

### POST `/admin/auctions`

```json
{
  "motorcycleId": "...",
  "startPrice": 500000,
  "reservePrice": 800000,
  "minIncrement": 10000,
  "startTime": "2025-06-24T18:00:00.000Z",
  "endTime": "2025-06-24T20:00:00.000Z",
  "schedule": true
}
```

`schedule: true` publishes the auction and enqueues BullMQ start/end jobs.

---

## Watchlist

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/watchlist` | JWT | User's watched auctions |
| POST | `/watchlist/:auctionId` | JWT | Add |
| DELETE | `/watchlist/:auctionId` | JWT | Remove |

When authenticated, `GET /auctions/:id` includes `isWatched: boolean`.

---

## Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications` | JWT | Paginated (`?unread=true`) |
| GET | `/notifications/unread-count` | JWT | Unread count |
| PATCH | `/notifications/:id/read` | JWT | Mark one read |
| PATCH | `/notifications/read-all` | JWT | Mark all read |

Notification types include `OUTBID`, `AUCTION_WON`, `AUCTION_ENDING_SOON`, `AUCTION_STARTED`.

Real-time delivery: Socket.IO event `notification:new` on room `user:{userId}`.

---

## Real-time

See [socket-events.md](socket-events.md) for the full WebSocket event catalog.

Client → server: `join:auction`, `leave:auction`, `join:live`, `join:admin`

Server → client: `auction:snapshot`, `bid:update`, `auction:extended`, `auction:ended`, `notification:new`

---

## Idempotency

`POST /auctions/:id/bids` accepts `Idempotency-Key`. Replaying the same key within the TTL returns the original response without double-charging the bid increment in Redis.

---

## Rate limits

Bid endpoint: per-user limit enforced in Redis (default window documented in code). Returns `429` with `RATE_LIMITED`.
