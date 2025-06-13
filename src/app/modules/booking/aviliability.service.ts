
import { Servicewc } from "../service/serviceswc.model";
import { User } from "../user/user.model";
import { Booking } from "./booking.model";


export const getServiceProviderTimeSlots = async (serviceProviderId: string, bookingDate: Date) => {
  try {
    // Check if user exists and get their role
    const user = await User.findById(serviceProviderId).select('role name email');
    
    if (!user) {
      console.error(`User not found. serviceProviderId: ${serviceProviderId}`);
      throw new Error('User not found');
    }

    // Allow both ADMIN and SERVICE_PROVIDER roles to have time slots
    if (!['ADMIN', 'SERVICE_PROVIDER'].includes(user.role)) {
      throw new Error(`Users with role ${user.role} cannot provide services`);
    }

    // Generate time slots for the day
    const timeSlots = generateTimeSlots(bookingDate);
    
    const startOfDay = new Date(bookingDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(bookingDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get all bookings for this provider on this date
    const bookings = await Booking.find({
      serviceProviderId,
      bookingDate: { 
        $gte: startOfDay, 
        $lt: endOfDay 
      },
      status: { $nin: ['Cancelled', 'Rejected'] } // Exclude cancelled/rejected bookings
    }).select('timeSlot');

    // Ensure bookedSlots is a Set of strings
    const bookedSlots = new Set<string>(
      bookings
        .map(booking => {
          if (typeof booking.timeSlot === 'string') return booking.timeSlot;
          if (Array.isArray(booking.timeSlot)) return booking.timeSlot[0];
          return undefined;
        })
        .filter((slot): slot is string => typeof slot === 'string')
    );

    return timeSlots.map(slot => ({
      timeSlot: slot,
      status: bookedSlots.has(slot) ? 'Booked' : 'Available',
    }));

    // const bookedSlots = new Set(bookings.map(booking => booking.timeSlot));

    // return timeSlots.map(slot => ({
    //   timeSlot: slot,
    //   status: bookedSlots.has(slot) ? 'Booked' : 'Available',
    // }));

  } catch (error) {
    console.error(`Error in getServiceProviderTimeSlots for serviceProviderId: ${serviceProviderId} and date: ${bookingDate}:`, error);
    throw error;
  }
};

// Helper function to generate time slots (updated to match your valid slots)
const generateTimeSlots = (date: Date) => {
  return ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
};
