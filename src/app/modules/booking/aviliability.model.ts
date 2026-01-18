
import mongoose, { Model, model, Schema, Types } from 'mongoose';

// Interface for time slots
interface ITimeSlot {
  startTime: string;
  endTime: string;
  isBooked: boolean;
  bookingId?: Types.ObjectId | null;
}

// Interface for availability document
interface IAvailability {
  serviceProviderId: Types.ObjectId;
  date: Date;
  timeSlots: ITimeSlot[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Availability model interface
interface AvailabilityModel extends Model<IAvailability> {}

const timeSlotSchema = new Schema<ITimeSlot>({
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  isBooked: {
    type: Boolean,
    default: false,
  },
  bookingId: {
    type: Schema.Types.ObjectId,
    ref: 'Booking',
    default: null,
  }
});

const availabilitySchema = new Schema<IAvailability, AvailabilityModel>(
  {
    serviceProviderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
 timeSlots: [timeSlotSchema],
  },
  { timestamps: true }
);

// Create compound index for efficient queries
availabilitySchema.index({ serviceProviderId: 1, date: 1 });

export const Availability = model<IAvailability, AvailabilityModel>('Availability', availabilitySchema);
export { IAvailability, ITimeSlot };