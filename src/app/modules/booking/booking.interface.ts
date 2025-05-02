import mongoose from "mongoose";

export interface IBooking {
    serviceType: 'Home Service' | 'Washing' | 'Plumbing' | 'Painting' | 'Electrician' | 'Cleaning' | 'Handyman' | 'Gardening' | 'Removalists' | 'IT' | 'Car Mechanic' | 'AC Technician';
    serviceId: string;
    userId: string;
    serviceProviderId?: string;
    bookingDate: Date; 
    status: 'Pending' | 'Accepted' | 'Canceled' | 'Completed';
    paymentStatus: 'Pending' | 'Paid' | 'Refunded';
    location: string; 
    contactNumber: string;
    paymentSessionId: string;
    images: string[]; 
  }
 