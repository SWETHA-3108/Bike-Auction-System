export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'bidder' | 'admin';
  phone?: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface Motorcycle {
  id?: string;
  title?: string;
  make?: string;
  model?: string;
  year?: number;
  mileage?: number;
  engineCc?: number;
  color?: string;
  condition?: string;
  description?: string;
  images?: string[];
  location?: { city: string; state: string };
}

export interface AuctionLiveState {
  currentPrice: number;
  highBidderId: string | null;
  bidCount: number;
  endTime: string;
  status: string;
  extensionCount: number;
}

export interface Auction {
  id: string;
  motorcycleId: string;
  motorcycle?: Motorcycle;
  sellerId: string;
  title: string;
  description?: string;
  status: 'draft' | 'scheduled' | 'live' | 'ended' | 'cancelled';
  startTime: string;
  endTime: string;
  startingPrice: number;
  currentPrice: number;
  minIncrement: number;
  buyNowPrice?: number;
  winnerId?: string;
  bidCount: number;
  watcherCount: number;
  softCloseExtensionSec: number;
  extensionThresholdSec: number;
  extensionCount: number;
  liveState?: AuctionLiveState | null;
  isWatched?: boolean;
}

export interface Bid {
  id: string;
  amount: number;
  bidSequence: number;
  status: string;
  bidderName: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  status: string;
  createdAt: string;
  readAt?: string;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface PlaceBidResult {
  bid: { id: string; amount: number; bidSequence: number; createdAt: string };
  auction: {
    currentPrice: number;
    bidCount: number;
    endTime: string;
    status: string;
    extensionCount: number;
  };
}
