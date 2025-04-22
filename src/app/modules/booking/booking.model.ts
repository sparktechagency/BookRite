import mongoose, { Document, Schema } from 'mongoose';
import {IBooking} from "./booking.interface";
const bookingSchema: Schema = new Schema(
  {
    serviceType: {
      type: String,
      required: true,
      enum: [
        'Home Service',
        'Washing',
        'Plumbing',
        'Painting',
        'Electrician',
        'Cleaning',
        'Handyman',
        'Gardening',
        'Removalists',
        'IT',
        'Car Mechanic',
        'AC Technician'
      ],
    },
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    serviceProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceProvider', 
      required: false, 
    },
    bookingDate: { 
      type: Date, 
      required: true 
    },
    status: { 
      type: String, 
      default: 'Pending',
      enum: ['Pending', 'Confirmed', 'Completed'],
    },
    location: { 
      type: String, 
      required: true 
    },
    images: { 
      type: [String], 
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const Booking = mongoose.model<IBooking>('Booking', bookingSchema);
