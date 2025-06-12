import mongoose, { Document, model, Schema } from 'mongoose';
import {IBooking} from "./booking.interface";
const bookingSchema = new Schema<IBooking>({

  serviceId: {
    type: Schema.Types.ObjectId as any,
    ref: 'Servicewc', 
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
  price: { type: Number, 
  ref: 'Servicewc',
  required: false 
},
  bookingDate: { 
    type: Date, 
    required: true 
  },
  timeSlot: { type: String, required: false }, 

  location: { type: String, required: true },

  contactNumber: { type: String, required: true },
  status: { type: String, default: 'Pending', enum: ['Pending', 'Accepted', 'Completed', 'Cancelled'] },
  paymentStatus: { type: String, default: 'Pending', enum: ['Pending', 'Refunded', 'Paid'] },
  images: { type: [String], default: [] },
  paymentSessionId: { type: String, required: false },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const Booking = model<IBooking>('Booking', bookingSchema);
