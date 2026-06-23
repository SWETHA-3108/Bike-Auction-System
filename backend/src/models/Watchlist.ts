import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IWatchlist extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  auctionId: Types.ObjectId;
  createdAt: Date;
}

const watchlistSchema = new Schema<IWatchlist>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    auctionId: { type: Schema.Types.ObjectId, ref: 'Auction', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

watchlistSchema.index({ userId: 1, auctionId: 1 }, { unique: true });
watchlistSchema.index({ userId: 1 });
watchlistSchema.index({ auctionId: 1 });

export const Watchlist =
  mongoose.models.Watchlist ?? mongoose.model<IWatchlist>('Watchlist', watchlistSchema);
