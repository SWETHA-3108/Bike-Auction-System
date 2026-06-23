import mongoose, { Schema, Document, Types } from 'mongoose';
import { MotorcycleCondition, MotorcycleStatus } from '../types/index.js';

export interface IMotorcycle extends Document {
  _id: Types.ObjectId;
  sellerId: Types.ObjectId;
  title: string;
  make: string;
  bikeModel: string;
  year: number;
  mileage: number;
  engineCc: number;
  color: string;
  condition: MotorcycleCondition;
  description: string;
  images: string[];
  vin?: string;
  location: { city: string; state: string };
  status: MotorcycleStatus;
  createdAt: Date;
  updatedAt: Date;
}

const motorcycleSchema = new Schema<IMotorcycle>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    make: { type: String, required: true, trim: true },
    bikeModel: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    mileage: { type: Number, required: true },
    engineCc: { type: Number, required: true },
    color: { type: String, required: true, trim: true },
    condition: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      required: true,
    },
    description: { type: String, required: true },
    images: { type: [String], default: [] },
    vin: { type: String, trim: true },
    location: {
      city: { type: String, required: true },
      state: { type: String, required: true },
    },
    status: {
      type: String,
      enum: ['draft', 'listed', 'sold'],
      default: 'draft',
    },
  },
  { timestamps: true }
);

motorcycleSchema.index({ make: 1, bikeModel: 1, year: 1 });
motorcycleSchema.index({ sellerId: 1 });
motorcycleSchema.index({ status: 1 });

export const Motorcycle =
  mongoose.models.Motorcycle ?? mongoose.model<IMotorcycle>('Motorcycle', motorcycleSchema);
