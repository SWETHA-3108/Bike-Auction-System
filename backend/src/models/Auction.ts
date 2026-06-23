import mongoose, { Schema, Document, Types } from 'mongoose';
import { AuctionStatus } from '../types/index.js';

export interface IAuction extends Document {
  _id: Types.ObjectId;
  motorcycleId: Types.ObjectId;
  sellerId: Types.ObjectId;
  title: string;
  description?: string;
  status: AuctionStatus;
  startTime: Date;
  endTime: Date;
  originalEndTime: Date;
  startingPrice: number;
  currentPrice: number;
  minIncrement: number;
  reservePrice?: number;
  buyNowPrice?: number;
  winnerId?: Types.ObjectId;
  winningBidId?: Types.ObjectId;
  bidCount: number;
  watcherCount: number;
  softCloseExtensionSec: number;
  extensionThresholdSec: number;
  maxExtensions?: number;
  extensionCount: number;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const auctionSchema = new Schema<IAuction>(
  {
    motorcycleId: { type: Schema.Types.ObjectId, ref: 'Motorcycle', required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'live', 'ended', 'cancelled'],
      default: 'draft',
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    originalEndTime: { type: Date, required: true },
    startingPrice: { type: Number, required: true },
    currentPrice: { type: Number, required: true },
    minIncrement: { type: Number, required: true, default: 100 },
    reservePrice: { type: Number },
    buyNowPrice: { type: Number },
    winnerId: { type: Schema.Types.ObjectId, ref: 'User' },
    winningBidId: { type: Schema.Types.ObjectId, ref: 'Bid' },
    bidCount: { type: Number, default: 0 },
    watcherCount: { type: Number, default: 0 },
    softCloseExtensionSec: { type: Number, default: 120 },
    extensionThresholdSec: { type: Number, default: 60 },
    maxExtensions: { type: Number },
    extensionCount: { type: Number, default: 0 },
    startedAt: { type: Date },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

auctionSchema.index({ status: 1, startTime: 1 });
auctionSchema.index({ status: 1, endTime: 1 });
auctionSchema.index({ motorcycleId: 1 });
auctionSchema.index({ sellerId: 1 });

export const Auction = mongoose.models.Auction ?? mongoose.model<IAuction>('Auction', auctionSchema);
