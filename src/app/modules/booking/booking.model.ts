import mongoose, { Document, model, Schema } from 'mongoose';
import {IBooking} from "./booking.interface";
const bookingSchema = new Schema<IBooking>({
  serviceType: {
    type: String,
    required: true,
    enum: [
      'Home Service',
      'Washings',
      'Plumbing',
      'Painting',
      'Electrician',
      'Cleaning',
      'Handyman',
      'Gardening',
      'Removalists',
      'IT',
      'Car Mechanic',
      'AC Technician',
    ],
  },
  serviceId: {
    type: Schema.Types.ObjectId as any,
    ref: 'Servicewc', // Reference to the Servicewc model
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId as any,
    ref: 'User',
    required: false,
  },
  serviceProviderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  bookingDate: { 
    type: Date, 
    required: true 
  },

  location: { type: String, required: true },
  contactNumber: { type: String, required: true },
  status: { type: String, default: 'Pending', enum: ['Pending', 'Accepted', 'Completed'] },
  paymentStatus: { type: String, default: 'Pending', enum: ['Pending', 'Paid', 'Refunded'] },
  images: { type: [String], default: [] },
  paymentSessionId: { type: String, required: false },
}, { timestamps: true });

export const Booking = model<IBooking>('Booking', bookingSchema);
