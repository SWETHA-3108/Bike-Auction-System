export type UserRole = 'bidder' | 'admin';

export type AuctionStatus = 'draft' | 'scheduled' | 'live' | 'ended' | 'cancelled';

export type BidStatus = 'accepted' | 'outbid' | 'winning' | 'rejected';

export type MotorcycleCondition = 'excellent' | 'good' | 'fair' | 'poor';

export type MotorcycleStatus = 'draft' | 'listed' | 'sold';

export type NotificationType =
  | 'bid_outbid'
  | 'auction_starting'
  | 'auction_ended'
  | 'auction_extended'
  | 'watchlist_reminder'
  | 'system';

export type NotificationChannel = 'in_app' | 'email';

export type NotificationStatus = 'pending' | 'sent' | 'read';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface IUser {
  email: string;
  passwordHash: string;
  role: UserRole;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  refreshTokenHash?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
