import mongoose, { Schema, Document } from 'mongoose';

interface IAvailability extends Document {
  serviceProviderId: mongoose.Types.ObjectId;
  date: Date;
  timeSlots: {
    startTime: string; // "09:00"
    endTime: string;   // "10:00"
    isBooked: boolean;
    bookingId?: mongoose.Types.ObjectId;
  }[];
  isAvailable: boolean;
}

const availabilitySchema = new Schema<IAvailability>({
  serviceProviderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  timeSlots: [{
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },
    isBooked: {
      type: Boolean,
      default: false
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking'
    }
  }],
  isAvailable: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
availabilitySchema.index({ serviceProviderId: 1, date: 1 });

export const Availability = mongoose.model<IAvailability>('Availability', availabilitySchema);
