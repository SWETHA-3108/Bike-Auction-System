import mongoose, { Schema, Document, Types } from 'mongoose';
import { BidStatus } from '../types/index.js';

export interface IBid extends Document {
  _id: Types.ObjectId;
  auctionId: Types.ObjectId;
  userId: Types.ObjectId;
  amount: number;
  bidSequence: number;
  status: BidStatus;
  rejectionReason?: string;
  clientIp?: string;
  userAgent?: string;
  createdAt: Date;
}

const bidSchema = new Schema<IBid>(
  {
    auctionId: { type: Schema.Types.ObjectId, ref: 'Auction', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    bidSequence: { type: Number, required: true },
    status: {
      type: String,
      enum: ['accepted', 'outbid', 'winning', 'rejected'],
      required: true,
    },
    rejectionReason: { type: String },
    clientIp: { type: String },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

bidSchema.index({ auctionId: 1, createdAt: -1 });
bidSchema.index({ auctionId: 1, bidSequence: 1 }, { unique: true });
bidSchema.index({ userId: 1, createdAt: -1 });

export const Bid = mongoose.models.Bid ?? mongoose.model<IBid>('Bid', bidSchema);
