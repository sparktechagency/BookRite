import mongoose, { Types } from "mongoose";

export interface IBooking {
    serviceType: 'Home Service' | 'Washing' | 'Plumbing' | 'Painting' | 'Electrician' | 'Cleaning' | 'Handyman' | 'Gardening' | 'Removalists' | 'IT' | 'Car Mechanic' | 'AC Technician';
    serviceId: Types.ObjectId;
    userId: string;
    serviceProviderId?: string;
    price: number;
    bookingDate: Date; 
    timeSlot?: string[];
    status: 'Pending' | 'Accepted' | 'Completed' | 'Cancelled';
    paymentStatus: 'Pending' | 'Refunded' | 'Paid';
    location: String; 
    contactNumber: string;
    paymentSessionId: string;
    images: string[]; 
    createdAt: Date;
    updatedAt: Date;
  }
 