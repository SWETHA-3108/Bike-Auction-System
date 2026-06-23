import mongoose, { Schema, Document, Types } from 'mongoose';
import { UserRole } from '../types/index.js';

export interface IUser extends Document {
  _id: Types.ObjectId;
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

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['bidder', 'admin'], default: 'bidder' },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    avatarUrl: { type: String },
    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    refreshTokenHash: { type: String },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });

export const User = mongoose.models.User ?? mongoose.model<IUser>('User', userSchema);