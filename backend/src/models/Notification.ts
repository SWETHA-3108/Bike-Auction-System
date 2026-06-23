import mongoose, { Schema, Document, Types } from 'mongoose';
import {
  NotificationType,
  NotificationChannel,
  NotificationStatus,
} from '../types/index.js';

export interface INotification extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  channel: NotificationChannel;
  status: NotificationStatus;
  createdAt: Date;
  readAt?: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'bid_outbid',
        'auction_starting',
        'auction_ended',
        'auction_extended',
        'watchlist_reminder',
        'system',
      ],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    channel: { type: String, enum: ['in_app', 'email'], default: 'in_app' },
    status: { type: String, enum: ['pending', 'sent', 'read'], default: 'sent' },
    readAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, status: 1 });

export const Notification =
  mongoose.models.Notification ?? mongoose.model<INotification>('Notification', notificationSchema);
