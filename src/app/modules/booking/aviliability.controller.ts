import { Request, Response } from 'express';
import { getServiceProviderTimeSlots } from './aviliability.service';
import { Booking } from './booking.model';
import { Availability } from './aviliability.model';
import {Notification} from '../notification/notification.model';
import { User } from '../user/user.model';
import { Servicewc } from '../service/serviceswc.model';
import { getIO } from '../../../helpers/socket';

export const checkSlotAvailability = async (serviceProviderId: string, bookingDate: Date, timeSlot: string): Promise<boolean> => {
  try {
    const startOfDay = new Date(bookingDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(bookingDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingBooking = await Booking.findOne({
      serviceProviderId,
      bookingDate: {
        $gte: startOfDay,
        $lt: endOfDay
      },
      timeSlot,
      status: { $nin: ['Cancelled', 'Rejected'] } 
    });
    return !existingBooking;
  } catch (error) {
    console.error('Error checking slot availability:', error);
    throw new Error('Failed to check slot availability');
  }
};

export const ensureAvailabilityExists = async (serviceProviderId: string, date: Date): Promise<void> => {
  try {
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
        "09:00", "10:00", "11:00","12:00", "13:00", "14:00", "15:00", "16:00", "17:00"
      ].map(time => ({
        startTime: time,
        endTime: getEndTime(time), 
        isBooked: false,
        bookingId: null
      }));

      const newAvailability = new Availability({
        serviceProviderId,
        date: targetDate,
        timeSlots: defaultTimeSlots
      });

      await newAvailability.save();
      console.log(`Created availability for service provider ${serviceProviderId} on ${targetDate.toISOString().split('T')[0]}`);
    }
  } catch (error) {
    console.error('Error ensuring availability exists:', error);
    throw new Error('Failed to create availability');
  }
};


const getEndTime = (startTime: string): string => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const endHour = hours + 1;
  return `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

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

    const validTimeSlots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
    
    // Validate each time slot
    if (Array.isArray(timeSlot)) {
      for (const slot of timeSlot) {
        if (!validTimeSlots.includes(slot)) {
          res.status(400).json({
            success: false,
            message: `Invalid time slot: ${slot}. Valid slots are: ` + validTimeSlots.join(', '),
          });
          return;
        }
      }
    } else {
      res.status(400).json({
        success: false,
        message: 'Time slot should be an array of valid time slots.',
      });
      return;
    }

    const serviceProvider = await User.findById(serviceProviderId);
    if (!serviceProvider) {
      res.status(404).json({ success: false, message: 'Service provider not found' });
      return;
    }

    if (!['ADMIN', 'SERVICE_PROVIDER'].includes(serviceProvider.role)) {
      res.status(400).json({ 
        success: false, 
        message: `User with role ${serviceProvider.role} cannot provide services` 
      });
      return;
    }

    const service = await Servicewc.findById(serviceId);
    if (!service) {
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }

    const parsedBookingDate = new Date(bookingDate);
    
    // Check if the booking date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsedBookingDate < today) {
      res.status(400).json({
        success: false,
        message: 'Cannot book for past dates'
      });
      return;
    }

    await ensureAvailabilityExists(serviceProviderId, parsedBookingDate);

    // Check if all slots are available
    for (const slot of timeSlot) {
      const isSlotAvailable = await checkSlotAvailability(serviceProviderId, parsedBookingDate, slot);
      if (!isSlotAvailable) {
        res.status(400).json({
          success: false,
          message: `Selected time slot ${slot} is not available. Please choose another time.`
        });
        return;
      }
    }

    const newBookingIds = [];

    // Create bookings for each time slot
    for (const slot of timeSlot) {
      const newBooking = new Booking({
        serviceId,
        userId,
        serviceProviderId,
        bookingDate: parsedBookingDate,
        timeSlot: slot,
        location,
        contactNumber,
        images: images || [],
        status: 'Pending'
      });

      const savedBooking = await newBooking.save();
      newBookingIds.push(savedBooking._id);

      const targetDate = new Date(parsedBookingDate);
      targetDate.setUTCHours(0, 0, 0, 0);

      await Availability.updateOne(
        {
          serviceProviderId,
          date: {
            $gte: targetDate,
            $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
          },
          'timeSlots.startTime': slot
        },
        {
          $set: {
            'timeSlots.$.isBooked': true,
            'timeSlots.$.bookingId': savedBooking._id
          }
        }
      );

      const notificationText = `New booking for ${service.serviceName} on ${parsedBookingDate.toLocaleDateString()} at ${slot}`;

      const notification = await Notification.create({
        text: notificationText,
        receiver: serviceProviderId,
        sender: userId,
        referenceId: savedBooking._id.toString(),
        screen: 'OFFER',
        read: false,
        type: 'ADMIN',
      });

      const io = getIO();
      io.emit(`notification::${serviceProviderId}`, { 
        text: notificationText,
        type: "Booking",
        booking: savedBooking,
        createdAt: notification.createdAt
      });
    }

    res.status(201).json({
      success: true,
      message: 'Bookings created successfully',
      data: {
        bookingIds: newBookingIds,
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

const getTimeSlots = async (req: Request, res: Response) => {
  const { serviceProviderId, bookingDate } = req.params;

  try {
    const date = new Date(bookingDate);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const timeSlots = await getServiceProviderTimeSlots(serviceProviderId, date);
    return res.status(200).json({ timeSlots });
  } catch (error) {
    console.error(`Error fetching time slots: ${error}`, error);
    
    if (error === 'Service provider not found') {
      return res.status(404).json({ error: 'Service provider not found' });
    }
    
    if (error === 'Admin users cannot provide services') {
      return res.status(403).json({ error: 'Admin users cannot provide services' });
    }
    
    if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string' && (error as any).message.includes('is not a service provider')) {
      return res.status(400).json({ error: 'User is not a service provider' });
    }
    
    if (error === 'No service found for this provider') {
      return res.status(404).json({ error: 'No service found for this provider' });
    }
    
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export { getTimeSlots };