
import { Servicewc } from "../service/serviceswc.model";
import { User } from "../user/user.model";
import { Booking } from "./booking.model";


export const getServiceProviderTimeSlots = async (serviceProviderId: string, bookingDate: Date) => {
  try {
    const user = await User.findById(serviceProviderId).select('role name email');

    if (!user) {
      throw new Error('User not found');
    }

    if (!['ADMIN', 'SERVICE_PROVIDER'].includes(user.role)) {
      throw new Error(`Users with role ${user.role} cannot provide services`);
    }

    const timeSlots = generateTimeSlots(bookingDate);

    const startOfDay = new Date(bookingDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(bookingDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      serviceProviderId,
      bookingDate: { $gte: startOfDay, $lt: endOfDay },
      status: { $nin: ['Cancelled', 'Rejected'] }
    }).select('timeSlot');

    const bookedSlots = new Set<string>(
      bookings.flatMap(booking =>
        Array.isArray(booking.timeSlot)
          ? booking.timeSlot
          : [booking.timeSlot]
      ).filter((slot): slot is string => typeof slot === 'string')
    );

    return timeSlots.map(slot => ({
      timeSlot: slot,
      status: bookedSlots.has(slot) ? 'Booked' : 'Available',
    }));

  } catch (error) {
    console.error(`Error in getServiceProviderTimeSlots:`, error);
    throw error;
  }
};


// Helper function to generate time slots (updated to match your valid slots)
const generateTimeSlots = (date: Date) => {
  return ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
};
