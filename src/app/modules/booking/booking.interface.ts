import mongoose from "mongoose";

export interface IBooking {
    serviceType: 'Home Service' | 'Washing' | 'Plumbing' | 'Painting' | 'Electrician' | 'Cleaning' | 'Handyman' | 'Gardening' | 'Removalists' | 'IT' | 'Car Mechanic' | 'AC Technician';
    userId: string;
    serviceProviderId?: string;
    bookingDate: string; 
    status: 'Pending' | 'Confirmed' | 'Completed';
    location: string; 
    images: string[]; 
  }
