import { Availability } from "./aviliability.model";
import { Types } from 'mongoose';  
import { Request, Response } from 'express';
import {Notification} from '../notification/notification.model'; // Adjust the path as needed
import { User } from "../user/user.model";
import { Servicewc } from "../service/serviceswc.model";
import { Booking } from "./booking.model";
import { getIO } from "../../../helpers/socket";

const generateDefaultAvailability = async (serviceProviderId: string, startDate: Date, endDate: Date) => {
  const defaultTimeSlots = [
    { startTime: "09:00", endTime: "10:00", isBooked: false },
    { startTime: "10:00", endTime: "11:00", isBooked: false },
    { startTime: "11:00", endTime: "12:00", isBooked: false },
    { startTime: "13:00", endTime: "14:00", isBooked: false }, // Skip lunch hour
    { startTime: "14:00", endTime: "15:00", isBooked: false },
    { startTime: "15:00", endTime: "16:00", isBooked: false },
    { startTime: "16:00", endTime: "17:00", isBooked: false },
    { startTime: "17:00", endTime: "18:00", isBooked: false }
  ];

  const availabilityData = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    // Skip weekends (optional - remove if you want weekend availability)
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      const availability = new Availability({
        serviceProviderId,
        date: new Date(currentDate),
        timeSlots: defaultTimeSlots,
        isAvailable: true
      });

      await availability.save();
      availabilityData.push({
        date: new Date(currentDate),
        timeSlots: defaultTimeSlots
      });
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return availabilityData;
};


export const getAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceProviderId } = req.params;
    const { startDate, endDate } = req.query;

    if (!serviceProviderId) {
      res.status(400).json({
        success: false,
        message: 'Service provider ID is required'
      });
      return;
    }

    // Default to next 30 days if no date range provided
    const start = startDate ? new Date(startDate as string) : new Date();
    const end = endDate ? new Date(endDate as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Define default working hours (9 AM to 6 PM, excluding lunch 12-1 PM)
    const defaultTimeSlots = [
      { startTime: "09:00", endTime: "10:00" },
      { startTime: "10:00", endTime: "11:00" },
      { startTime: "11:00", endTime: "12:00" },
      { startTime: "13:00", endTime: "14:00" }, // Skip lunch hour (12-13)
      { startTime: "14:00", endTime: "15:00" },
      { startTime: "15:00", endTime: "16:00" },
      { startTime: "16:00", endTime: "17:00" },
      { startTime: "17:00", endTime: "18:00" }
    ];

    // Get existing bookings for the service provider in the date range
    const existingBookings = await Booking.find({
      serviceProviderId,
      bookingDate: {
        $gte: start,
        $lte: end
      },
      status: { $in: ['ACCEPTED', 'CONFIRMED'] } // Only check confirmed/accepted bookings
    }).select('bookingDate timeSlot status');

    console.log('Found existing bookings:', existingBookings.length);

    // Generate availability for each day in the range
    const availabilityData = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      // Skip weekends (optional - remove if you want weekend availability)
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Sunday, 6 = Saturday
        
        // Get bookings for this specific date
        const dateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        const bookingsForDate = existingBookings.filter(booking => {
          const bookingDateStr = new Date(booking.bookingDate).toISOString().split('T')[0];
          return bookingDateStr === dateStr;
        });

        // Get booked time slots for this date
        const bookedTimeSlots = bookingsForDate.map(booking => booking.timeSlot);
        
        console.log(`Date: ${dateStr}, Booked slots:`, bookedTimeSlots);

        // Filter out booked time slots
        const availableTimeSlots = defaultTimeSlots.filter(slot => 
          !bookedTimeSlots.includes(slot.startTime)
        );

        // Only include days that have available slots
        if (availableTimeSlots.length > 0) {
          availabilityData.push({
            date: new Date(currentDate),
            timeSlots: availableTimeSlots,
            stats: {
              total: defaultTimeSlots.length,
              available: availableTimeSlots.length,
              booked: bookedTimeSlots.length,
              bookedSlots: bookedTimeSlots
            }
          });
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.status(200).json({
      success: true,
      data: availabilityData,
      summary: {
        totalDays: availabilityData.length,
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching availability:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching availability',
      errorMessages: error.message || error
    });
  }
};



export const getAvailabilityWithAllDays = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceProviderId } = req.params;
    const { startDate, endDate } = req.query;

    if (!serviceProviderId) {
      res.status(400).json({
        success: false,
        message: 'Service provider ID is required'
      });
      return;
    }

    // Default to next 30 days if no date range provided
    const start = startDate ? new Date(startDate as string) : new Date();
    const end = endDate ? new Date(endDate as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const availability = await Availability.find({
      serviceProviderId,
      date: {
        $gte: start,
        $lte: end
      },
      isAvailable: true
    }).sort({ date: 1 });

    // If no availability found, generate default availability
    if (availability.length === 0) {
      const generatedAvailability = await generateDefaultAvailability(serviceProviderId, start, end);
      res.status(200).json({
        success: true,
        data: generatedAvailability
      });
      return;
    }

    // Return all days with their slot status
    const availableSlots = availability.map(day => {
      const availableTimeSlots = day.timeSlots.filter(slot => !slot.isBooked);
      const bookedTimeSlots = day.timeSlots.filter(slot => slot.isBooked);
      
      return {
        date: day.date,
        availableSlots: availableTimeSlots,
        bookedSlots: bookedTimeSlots,
        allSlots: day.timeSlots,
        isFullyBooked: availableTimeSlots.length === 0,
        hasAvailableSlots: availableTimeSlots.length > 0,
        stats: {
          total: day.timeSlots.length,
          available: availableTimeSlots.length,
          booked: bookedTimeSlots.length
        }
      };
    });

    res.status(200).json({
      success: true,
      data: availableSlots
    });

  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching availability',
      errorMessages: error.message || error
    });
  }
};



// Check if a specific time slot is available based on existing bookings
export const checkSlotAvailability = async (serviceProviderId: string, bookingDate: Date, timeSlot: string): Promise<boolean> => {
  try {
    // Normalize date to compare only date part (not time)
    const targetDate = new Date(bookingDate);
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

    console.log('Checking slot availability:', {
      serviceProviderId,
      date: startOfDay.toISOString().split('T')[0],
      timeSlot
    });

    // Check if there's already a booking for this service provider, date, and time slot
    const existingBooking = await Booking.findOne({
      serviceProviderId,
      bookingDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      timeSlot,
      status: { $in: ['ACCEPTED', 'CONFIRMED', 'PENDING'] } // Include pending to prevent double booking
    });

    const isAvailable = !existingBooking;
    console.log('Slot availability result:', {
      isAvailable,
      existingBooking: existingBooking ? {
        id: existingBooking._id,
        status: existingBooking.status,
        timeSlot: existingBooking.timeSlot
      } : null
    });

    return isAvailable;
  } catch (error) {
    console.error('Error checking slot availability:', error);
    return false;
  }
};

export const ensureAvailabilityExists = async (serviceProviderId: string, date: Date): Promise<void> => {
  const targetDate = new Date(date);
  targetDate.setUTCHours(0, 0, 0, 0);

  const existingAvailability = await Availability.findOne({
    serviceProviderId,
    date: {
      $gte: targetDate,
      $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
    }
  });

  if (!existingAvailability) {
    const defaultTimeSlots = [
      { startTime: "09:00", endTime: "10:00", isBooked: false },
      { startTime: "10:00", endTime: "11:00", isBooked: false },
      { startTime: "11:00", endTime: "12:00", isBooked: false },
      { startTime: "13:00", endTime: "14:00", isBooked: false },
      { startTime: "14:00", endTime: "15:00", isBooked: false },
      { startTime: "15:00", endTime: "16:00", isBooked: false },
      { startTime: "16:00", endTime: "17:00", isBooked: false },
      { startTime: "17:00", endTime: "18:00", isBooked: false }
    ];

    const newAvailability = new Availability({
      serviceProviderId,
      date: targetDate,
      timeSlots: defaultTimeSlots,
      isAvailable: true
    });

    await newAvailability.save();
    console.log('Created new availability for date:', targetDate.toISOString());
  }
};

// Updated createBooking with auto-creation of availability
export const createBookingWithAutoAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceId, bookingDate, location, images, contactNumber, serviceProviderId, timeSlot } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized: User not found in token' });
      return;
    }

    if (!serviceId || !bookingDate || !location || !contactNumber || !serviceProviderId || !timeSlot) {
      res.status(400).json({
        success: false,
        message: 'Please provide all required fields: serviceId, bookingDate, location, contactNumber, serviceProviderId, timeSlot',
      });
      return;
    }

    const serviceProvider = await User.findById(serviceProviderId);
    if (!serviceProvider || serviceProvider.role !== 'ADMIN') {
      res.status(400).json({ success: false, message: 'Service provider must be an admin' });
      return;
    }

    const service = await Servicewc.findById(serviceId);
    if (!service) {
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }

    const parsedBookingDate = new Date(bookingDate);
    
    // Ensure availability exists for the requested date
    await ensureAvailabilityExists(serviceProviderId, parsedBookingDate);

    // Check availability before creating booking
    const isSlotAvailable = await checkSlotAvailability(serviceProviderId, parsedBookingDate, timeSlot);

    if (!isSlotAvailable) {
      res.status(400).json({
        success: false,
        message: 'Selected time slot is not available. Please choose another time.'
      });
      return;
    }

    // Continue with booking creation...
    const newBooking = new Booking({
      serviceId,
      userId,
      serviceProviderId,
      bookingDate: parsedBookingDate,
      timeSlot,
      location,
      contactNumber,
      images: images || [],
    });

    await newBooking.save();

    // Mark the time slot as booked
    const targetDate = new Date(parsedBookingDate);
    targetDate.setUTCHours(0, 0, 0, 0);

    await Availability.updateOne(
      {
        serviceProviderId,
        date: {
          $gte: targetDate,
          $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
        },
        'timeSlots.startTime': timeSlot
      },
      {
        $set: {
          'timeSlots.$.isBooked': true,
          'timeSlots.$.bookingId': newBooking._id
        }
      }
    );

    const notificationText = `New booking for ${service.serviceName} on ${parsedBookingDate.toLocaleDateString()} at ${timeSlot}`;

    const notification = await Notification.create({
      text: notificationText,
      receiver: serviceProviderId,
      sender: userId,
      referenceId: newBooking._id.toString(),
      screen: 'OFFER',
      read: false,
      type: 'ADMIN',
    });

    const savedNotification = await Notification.findById(notification._id);

    const io = getIO();
    io.emit(`notification::${userId}`, {
      text: notificationText,
      type: "Booking",
      booking: newBooking,
      createdAt: savedNotification ? (savedNotification as any).createdAt : undefined
    });

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        booking: newBooking,
        price: service.price,
      },
    });
  } catch (error: any) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating booking',
      errorMessages: error.message || error,
    });
  }
};



// Optional: Get service provider's schedule/bookings for a specific date
export const getProviderSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceProviderId, date } = req.params;

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

    const bookings = await Booking.find({
      serviceProviderId,
      bookingDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $in: ['ACCEPTED', 'CONFIRMED', 'PENDING'] }
    }).populate('serviceId', 'serviceName')
      .populate('userId', 'name email')
      .sort({ timeSlot: 1 });

    const defaultTimeSlots = [
      "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"
    ];

    const schedule = defaultTimeSlots.map(timeSlot => {
      const booking = bookings.find(b => b.timeSlot === timeSlot);
      return {
        timeSlot,
        isBooked: !!booking,
        booking: booking || null
      };
    });

    res.status(200).json({
      success: true,
      data: {
        date: startOfDay.toISOString().split('T')[0],
        schedule,
        summary: {
          totalSlots: defaultTimeSlots.length,
          bookedSlots: bookings.length,
          availableSlots: defaultTimeSlots.length - bookings.length
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching provider schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching provider schedule',
      errorMessages: error.message || error
    });
  }
};