import mongoose from "mongoose";

export interface IBooking {
    serviceType: 'Home Service' | 'Washing' | 'Plumbing' | 'Painting' | 'Electrician' | 'Cleaning' | 'Handyman' | 'Gardening' | 'Removalists' | 'IT' | 'Car Mechanic' | 'AC Technician';
    serviceId: string;
    userId: string;
    serviceProviderId?: string;
    price: number;
    bookingDate: Date; 
    status: 'Pending' | 'Accepted' | 'Canceled' | 'Completed';
    paymentStatus: 'Pending' | 'Refunded' | 'Paid';
    location: string; 
    contactNumber: string;
    paymentSessionId: string;
    images: string[]; 
    createdAt: Date;
    updatedAt: Date;
  }
 