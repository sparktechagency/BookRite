import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Booking } from "./booking.model"; 
import { Servicewc } from "../service/serviceswc.model"; 
import  ApiError  from "../../../errors/ApiError";
import { StatusCodes } from "http-status-codes";
import { jwtHelper } from "../../../helpers/jwtHelper";
import config from "../../../config";
import { Secret } from "jsonwebtoken";
import { User } from "../user/user.model";
import mongoose from "mongoose";
import { getIO } from '../../../helpers/socket';
import { geocodeAddress } from '../../../util/map';

import { Notification } from "../notification/notification.model"; 
import { USER_ROLES } from "../../../enums/user";
import { Availability } from "./aviliability.model";
import { checkSlotAvailability } from "./aviliability.controller";



// export const createBooking = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { serviceId, bookingDate, location, images, contactNumber, serviceProviderId } = req.body;
//     const userId = req.user?.id;

//     if (!userId) {
//       res.status(401).json({ success: false, message: 'Unauthorized: User not found in token' });
//       return;
//     }

//     if ( !serviceId || !bookingDate || !location || !contactNumber || !serviceProviderId) {
//       res.status(400).json({
//         success: false,
//         message: 'Please provide all required fields: serviceType, serviceId, bookingDate, location, contactNumber, serviceProviderId',
//       });
//       return;
//     }

//     const serviceProvider = await User.findById(serviceProviderId);
//     if (!serviceProvider || serviceProvider.role !== 'ADMIN') {
//       res.status(400).json({ success: false, message: 'Service provider must be an admin' });
//       return;
//     }

//     const service = await Servicewc.findById(serviceId);
//     if (!service) {
//       res.status(404).json({ success: false, message: 'Service not found' });
//       return;
//     }

//     const newBooking = new Booking({
//       serviceId,
//       userId,
//       serviceProviderId,
//       bookingDate,
//       location,
//       contactNumber,
//       images: images || [],
//     });

//     await newBooking.save();

//     const notificationText = `New booking for ${service.serviceName} on ${new Date(bookingDate).toLocaleDateString()}`;

//     const notification = new Notification({
//       text: notificationText,
//       receiver: serviceProviderId,
//       sender: userId,
//       referenceId: newBooking._id.toString(),
//       screen: 'OFFER',    
//       read: false,
//       type: 'ADMIN',
//     });

//     await notification.save();

//     const savedNotification = await Notification.findById(notification._id);

//     // Emit notification to the serviceProvider room (userId)
//     // const io = getIO();
//     // io.to(serviceProviderId.toString()).emit('new_notification', {
//     //   notificationId: notification._id,
//     //   text: notificationText,
//     //   bookingId: newBooking._id,
//     //   createdAt: savedNotification ? (savedNotification as any).createdAt : undefined,
//     // });
//     const io = getIO();
//       io.emit(`notification::${userId}`, {
//         text: notificationText,
//         type: "Booking",
//         booking: newBooking,
//         createdAt: savedNotification ? (savedNotification as any).createdAt : undefined
//       });

//     res.status(201).json({
//       success: true,
//       message: 'Booking created successfully',
//       data: {
//         booking: newBooking,
//         price: service.price,
//       },
//     });
//   } catch (error: any) {
//     console.error(error);
//     res.status(500).json({
//       success: false,
//       message: 'Error creating booking',
//       errorMessages: error.message || error,
//     });
//   }
// };

export const createBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceId, bookingDate, location, images, contactNumber, serviceProviderId, timeSlot } = req.body;
    const userId = req.user?.id;

    console.log('Creating booking with data:', {
      serviceId,
      bookingDate,
      serviceProviderId,
      timeSlot,
      userId
    });

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
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsedBookingDate < today) {
      res.status(400).json({
        success: false,
        message: 'Cannot book for past dates'
      });
      return;
    }

    for (const slot of timeSlot) {
      const isSlotAvailable = await checkSlotAvailability(serviceProviderId, parsedBookingDate, slot);

      if (!isSlotAvailable) {
        res.status(400).json({
          success: false,
          message: `Selected time slot ${slot} is not available. Please choose another time.`,
          debug: {
            requestedDate: parsedBookingDate.toISOString().split('T')[0],
            requestedTimeSlot: slot,
            serviceProviderId
          }
        });
        return;
      }
    }

let geoCoordinates: [number, number] = [0, 0];

if (typeof location === 'string') {
  try {
    geoCoordinates = await geocodeAddress(location);
  } catch (error) {
     res.status(400).json({
      success: false,
      message: 'Invalid address. Could not convert to coordinates.',
    });
    return;
  }
}


    // const newBookingIds = [];

    // for (const slot of timeSlot) {
    //   const newBooking = new Booking({
    //     serviceId,
    //     userId,
    //     serviceProviderId,
    //     bookingDate: parsedBookingDate,
    //     timeSlot: slot,
    //     location,
    //     contactNumber,
    //     images: images || [],
    //     status: 'Pending'
    //   });

    //   const savedBooking = await newBooking.save();
    //   newBookingIds.push(savedBooking._id);

    //   const notificationText = `New booking for ${service.serviceName} on ${parsedBookingDate.toLocaleDateString()} at ${slot}`;

    //   const notification = new Notification({
    //     text: notificationText,
    //     receiver: serviceProviderId,
    //     sender: userId,
    //     referenceId: savedBooking._id.toString(),
    //     screen: 'BOOKING',
    //     read: false,
    //     type: 'ADMIN',
    //   });

    //   await notification.save();

    //   const io = getIO();
    //   io.emit(`notification::${serviceProviderId}`, { 
    //     text: notificationText,
    //     type: "Booking",
    //     booking: savedBooking,
    //     createdAt: notification.createdAt
    //   });

    //   const targetDate = new Date(parsedBookingDate);
    //   targetDate.setUTCHours(0, 0, 0, 0);

    //   await Availability.updateOne(
    //     {
    //       serviceProviderId,
    //       date: {
    //         $gte: targetDate,
    //         $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
    //       },
    //       'timeSlots.startTime': slot
    //     },
    //     {
    //       $set: {
    //         'timeSlots.$.isBooked': true,
    //         'timeSlots.$.bookingId': savedBooking._id
    //       }
    //     }
    //   );
    // }
const newBooking = new Booking({
  serviceId,
  userId,
  serviceProviderId,
  bookingDate: parsedBookingDate,
  timeSlot, // store the array of time slots
  location: {
    type: 'Point',
    coordinates: geoCoordinates
  },
  contactNumber,
  images: images || [],
  status: 'Pending'
});

const savedBooking = await newBooking.save();

// Send notification once for the entire booking
const notificationText = `New booking for ${service.serviceName} on ${parsedBookingDate.toLocaleDateString()} at ${timeSlot.join(', ')}`;

const notification = new Notification({
  text: notificationText,
  receiver: serviceProviderId,
  sender: userId,
  referenceId: savedBooking._id.toString(),
  screen: 'BOOKING',
  read: false,
  type: 'ADMIN',
});

await notification.save();

    // const io = global.io
    // if (io) {
    //     io.emit(`getMessage::${payload?.chatId}`, response);
    // }

const io = global.io;
io.emit(`notification::${serviceProviderId}`, { 
  text: notificationText,
  type: "Booking",
  booking: savedBooking,
  createdAt: notification.createdAt
});
console.log('🔔 Emitting to:', `notification::${serviceProviderId}`);
console.log('🧾 Notification Payload:', {
  text: notificationText,
  type: "Booking",
  booking: savedBooking,
  createdAt: notification.createdAt
});

// Mark each slot as booked in Availability
const targetDate = new Date(parsedBookingDate);
targetDate.setUTCHours(0, 0, 0, 0);

for (const slot of timeSlot) {
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
}
    // const newBookingIds = [savedBooking._id];
 const populatedBooking = await Booking.findById(savedBooking._id)
  // .populate('serviceId')
  // .populate('userId')
  // .populate('serviceProviderId');

res.status(201).json({
  success: true,
  message: 'Booking created successfully',
  data: {
  booking: {
      ...populatedBooking?.toObject?.(),
      price: service.price,
 
    },
    // price: service.price,
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

// export const createBooking = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { serviceId, bookingDate, location, images, contactNumber, serviceProviderId, timeSlot } = req.body;
//     const userId = req.user?.id;

//     console.log('Creating booking with data:', {
//       serviceId,
//       bookingDate,
//       serviceProviderId,
//       timeSlot,
//       userId
//     });

//     // Validation checks
//     if (!userId) {
//       res.status(401).json({ success: false, message: 'Unauthorized: User not found in token' });
//       return;
//     }

//     if (!serviceId || !bookingDate || !location || !contactNumber || !serviceProviderId || !timeSlot) {
//       res.status(400).json({
//         success: false,
//         message: 'Please provide all required fields: serviceId, bookingDate, location, contactNumber, serviceProviderId, timeSlot',
//       });
//       return;
//     }

//     // Validate time slot format
//     const validTimeSlots = ["09:00", "10:00", "11:00","12:00",  "13:00", "14:00", "15:00", "16:00", "17:00"];
//     if (!validTimeSlots.includes(timeSlot)) {
//       res.status(400).json({
//         success: false,
//         message: 'Invalid time slot. Valid slots are: ' + validTimeSlots.join(', ')
//       });
//       return;
//     }

//     // Check if service provider exists and validate their role
//     const serviceProvider = await User.findById(serviceProviderId);
//     if (!serviceProvider) {
//       res.status(404).json({ success: false, message: 'Service provider not found' });
//       return;
//     }

//     // Allow both ADMIN and SERVICE_PROVIDER roles (adjust as per your business logic)
//     if (!['ADMIN', 'SERVICE_PROVIDER'].includes(serviceProvider.role)) {
//       res.status(400).json({ 
//         success: false, 
//         message: `User with role ${serviceProvider.role} cannot provide services` 
//       });
//       return;
//     }

//     // Check if service exists
//     const service = await Servicewc.findById(serviceId);
//     if (!service) {
//       res.status(404).json({ success: false, message: 'Service not found' });
//       return;
//     }

//     const parsedBookingDate = new Date(bookingDate);
    
//     // Check if the booking date is in the past
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
//     if (parsedBookingDate < today) {
//       res.status(400).json({
//         success: false,
//         message: 'Cannot book for past dates'
//       });
//       return;
//     }

//     // Check availability
//     const isSlotAvailable = await checkSlotAvailability(serviceProviderId, parsedBookingDate, timeSlot);

//     if (!isSlotAvailable) {
//       res.status(400).json({
//         success: false,
//         message: 'Selected time slot is not available. Please choose another time.',
//         debug: {
//           requestedDate: parsedBookingDate.toISOString().split('T')[0],
//           requestedTimeSlot: timeSlot,
//           serviceProviderId
//         }
//       });
//       return;
//     }

//     // Create the booking
//     const newBooking = new Booking({
//       serviceId,
//       userId,
//       serviceProviderId,
//       bookingDate: parsedBookingDate,
//       timeSlot,
//       location,
//       contactNumber,
//       images: images || [],
//       status: 'Pending'
//     });

//     await newBooking.save();

//     // Create notification
//     const notificationText = `New booking for ${service.serviceName} on ${parsedBookingDate.toLocaleDateString()} at ${timeSlot}`;

//     const notification = new Notification({
//       text: notificationText,
//       receiver: serviceProviderId,
//       sender: userId,
//       referenceId: newBooking._id.toString(),
//       screen: 'OFFER',
//       read: false,
//       type: 'ADMIN',
//     });

//     await notification.save();

//     // Emit socket notification
//     const io = getIO();
//     io.emit(`notification::${serviceProviderId}`, { // Changed from userId to serviceProviderId
//       text: notificationText,
//       type: "Booking",
//       booking: newBooking,
//       createdAt: notification.createdAt
//     });

//     res.status(201).json({
//       success: true,
//       message: 'Booking created successfully',
//       data: {
//         booking: newBooking,
//         price: service.price,
//       },
//     });
//   } catch (error: any) {
//     console.error('Error creating booking:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error creating booking',
//       errorMessages: error.message || error,
//     });
//   }
// };

const getBookingById = async (req: Request, res: Response): Promise<void> => {
  const { bookingId } = req.params;

  const booking = await Booking.findById(bookingId)
    .sort({ createdAt: -1 })
    .populate('userId', 'name email contactNumber');

  if (!booking) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Booking not found');
  }

  res.json(booking);
};

const updateBookingStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const { status, paymentStatus } = req.body;

    if (!bookingId) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Booking ID is required',
      });
      return;
    }

    if (!status && !paymentStatus) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Please provide status or paymentStatus to update',
      });
      return;
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Booking not found',
      });
      return;
    }

    // ❗️Prevent updates if status is Cancelled
    if (booking.status === 'Cancelled') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'This booking has been cancelled and cannot be updated.',
      });
      return;
    }

    // ✅ Proceed with update
    if (status) booking.status = status;
    if (paymentStatus) booking.paymentStatus = paymentStatus;

    await booking.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Booking status updated successfully',
      data: booking,
    });
  } catch (error: any) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error updating booking status',
      errorMessages: error.message || error,
    });
  }
};

// const getUserBookings = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = req.user?._id;
//     if (!userId) {
//        res.status(StatusCodes.UNAUTHORIZED).json({
//         success: false,
//         message: 'Unauthorized: User not authenticated',
//       });
//     }

//     const bookings = await Booking.find({ userId })
//      .sort({ createdAt: -1 })
//       .populate('serviceProviderId')
//       .populate('serviceId', 'serviceName serviceDescription image category price location reviews')
//       .populate('userId' , 'reviews name email contactNumber')
 
//       .exec();

//     if (!bookings || bookings.length === 0) {
//        res.status(StatusCodes.NOT_FOUND).json({
//         success: false,
//         message: 'No bookings found for this user.',
//       });
//     }

//     // Map to clean format
//     const formattedBookings = bookings.map(booking => ({
//       bookingId: booking._id,
//       serviceType: booking.serviceType,
//       bookingDate: booking.bookingDate,
//       location: booking.location,
//       contactNumber: booking.contactNumber,
//       status: booking.status,
//       paymentStatus: booking.paymentStatus,
//       images: booking.images || [],
//       price: typeof booking.serviceId === 'object' && booking.serviceId !== null ? (booking.serviceId as any).price : 0,
//       service: typeof booking.serviceId === 'object' && booking.serviceId !== null
//         ? {
//             id: (booking.serviceId as any)._id,
//             name: (booking.serviceId as any).serviceName,
//             description: (booking.serviceId as any).serviceDescription,
//             image: (booking.serviceId as any).image,
//             categoryId: (booking.serviceId as any).category,
//             categoryName: (booking.serviceId as any).category?.name || '',
//             reviews: (booking.serviceId as any).reviews || [],
            
//           }
//         : null,
//       user: booking.userId
//         ? {
//             id:( booking.userId as any)._id,
//             name: (booking.userId as any).name,
//             email: (booking.userId as any).email,
//           }
//         : null,
//       serviceProvider: booking.serviceProviderId
//         ? {
//             id: (booking.serviceProviderId as any)._id,
//             name: (booking.serviceProviderId as any).name,
//             email: (booking.serviceProviderId as any).email,
//             role: (booking.serviceProviderId as any).role,
//             profile: (booking.serviceProviderId as any).profile,
//             verified: (booking.serviceProviderId as any).verified,
//             accountStatus: (booking.serviceProviderId as any).accountInformation?.status || false,
//             isSubscribed: (booking.serviceProviderId as any).isSubscribed || false,
//           }
//         : null,
//       createdAt: (booking.createdAt),
//       updatedAt: booking.updatedAt,
//     }));

//     res.status(StatusCodes.OK).json({
//       success: true,
//       data: formattedBookings,
//     });
//   } catch (error) {
//     console.error(error);
//     const err = error as ApiError;
//     res.status(err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
//       success: false,
//       message: err.message || 'Error fetching bookings',
//       errorMessages: error,
//     });
//   }
// };
const getUserBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    //;
    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Unauthorized: User not authenticated',
      });
      return;
    }

    const bookings = await Booking.find({ userId })
      .sort({ createdAt: -1 })
      .populate('serviceProviderId')
      .populate('serviceId', 'serviceName serviceDescription image category price location reviews')
      .populate('userId', 'reviews name email contactNumber')
      .exec();

    if (!bookings || bookings.length === 0) {
       res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'No bookings found for this user.',
      });
      return;
    }

    const formattedBookings = bookings.map(booking => ({
      bookingId: booking._id,
      serviceType: booking.serviceType,
      bookingDate: booking.bookingDate,
      location: booking.location,
      contactNumber: booking.contactNumber,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      images: booking.images || [],
      price:
        typeof booking.serviceId === 'object' && booking.serviceId !== null
          ? (booking.serviceId as any).price
          : 0,
      service:
        typeof booking.serviceId === 'object' && booking.serviceId !== null
          ? {
              id: (booking.serviceId as any)._id,
              name: (booking.serviceId as any).serviceName,
              description: (booking.serviceId as any).serviceDescription,
              image: (booking.serviceId as any).image,
              categoryId: (booking.serviceId as any).category,
              categoryName: (booking.serviceId as any).category?.name || '',
              reviews: (booking.serviceId as any).reviews || [],
            }
          : null,
      user: booking.userId
        ? {
            id: (booking.userId as any)._id,
            name: (booking.userId as any).name,
            email: (booking.userId as any).email,
          }
        : null,
      serviceProvider: booking.serviceProviderId
        ? {
            id: (booking.serviceProviderId as any)._id,
            name: (booking.serviceProviderId as any).name,
            email: (booking.serviceProviderId as any).email,
            role: (booking.serviceProviderId as any).role,
            profile: (booking.serviceProviderId as any).profile,
            verified: (booking.serviceProviderId as any).verified,
            accountStatus: (booking.serviceProviderId as any).accountInformation?.status || false,
            isSubscribed: (booking.serviceProviderId as any).isSubscribed || false,
            totalService: (booking.serviceProviderId as any).totalService || 0,
            review:(booking.serviceProviderId as any ).review || 0,
          }
        : null,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    }));

     res.status(StatusCodes.OK).json({
      success: true,
      data: formattedBookings,
    });
    return;
  } catch (error) {
    console.error(error);
    const err = error as ApiError;
     res.status(err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message || 'Error fetching bookings',
      errorMessages: error,
    });
    return;
  }
};
//get all bookings byId
const getUserBookingsById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Missing userId in route parameter',
      });
      return;
    }

    const bookings = await Booking.find({ userId })
      .sort({ createdAt: -1 })
      .populate('serviceProviderId')
      .populate('serviceId', 'serviceName serviceDescription image category price location reviews')
      .populate('userId', 'reviews name email contactNumber')
      .exec();

    if (!bookings || bookings.length === 0) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'No bookings found for this user.',
      });
      return;
    }


  const formattedBookings = bookings.map(booking => ({
      bookingId: booking._id,
      serviceType: booking.serviceType,
      bookingDate: booking.bookingDate,
      location: booking.location,
      contactNumber: booking.contactNumber,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      images: booking.images || [],
      price:
        typeof booking.serviceId === 'object' && booking.serviceId !== null
          ? (booking.serviceId as any).price
          : 0,
      service:
        typeof booking.serviceId === 'object' && booking.serviceId !== null
          ? {
              id: (booking.serviceId as any)._id,
              name: (booking.serviceId as any).serviceName,
              description: (booking.serviceId as any).serviceDescription,
              image: (booking.serviceId as any).image,
              categoryId: (booking.serviceId as any).category,
              categoryName: (booking.serviceId as any).category?.name || '',
              reviews: (booking.serviceId as any).reviews || [],
            }
          : null,
      user: booking.userId
        ? {
            id: (booking.userId as any)._id,
            name: (booking.userId as any).name,
            email: (booking.userId as any).email,
          }
        : null,
      serviceProvider: booking.serviceProviderId
        ? {
            id: (booking.serviceProviderId as any)._id,
            name: (booking.serviceProviderId as any).name,
            email: (booking.serviceProviderId as any).email,
            role: (booking.serviceProviderId as any).role,
            profile: (booking.serviceProviderId as any).profile,
            verified: (booking.serviceProviderId as any).verified,
            accountStatus: (booking.serviceProviderId as any).accountInformation?.status || false,
            isSubscribed: (booking.serviceProviderId as any).isSubscribed || false,
          }
        : null,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    }));

    res.status(StatusCodes.OK).json({
      success: true,
      data: formattedBookings,
    });
  } catch (error) {
    console.error(error);
    const err = error as ApiError;
    res.status(err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message || 'Error fetching bookings',
      errorMessages: error,
    });
  }
};


//get all bookings
export const getAllBookings = async (req: Request, res: Response) => {
  try {
     const { search } = req.query;

    // Base query object
    let query: any = {};

    if (search) {

      query = {
        $or: [
          { bookingReference: { $regex: search, $options: 'i' } },
          
        ],
      };
    }
    const bookings = await Booking.find()
     .sort({ createdAt: -1 })
      .populate('serviceProviderId')
      .populate('serviceId')
      .populate('userId')
      .exec();

    if (!bookings || bookings.length === 0) {
       res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'No bookings found.',
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    console.error(error);
    const err = error as ApiError;
    res.status(err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message || 'Error fetching bookings',
      errorMessages: error, 
    })
}
}

const getBookingLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.params;
    console.log('Booking ID:', bookingId); 

    const booking = await Booking.findById(bookingId);
    if (!booking) {
       res.status(404).json({ success: false, message: 'Booking not found' });
       return;
    }

    res.status(200).json({
      success: true,
      location: booking.location,
      booking,
    });
  } catch (error: any) {
    console.error(error);  // log full error
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getServiceBookingsWithUser  = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceId } = req.params;

    if (!serviceId) {
       res.status(400).json({
        success: false,
        message: "Service ID is required."
      });
    }

    const bookings = await Booking.find({ serviceId })
     .sort({ createdAt: -1 })
      .populate('userId', 'name email')  // populate only name and email of user
      .select('paymentStatus serviceType serviceId serviceProviderId bookingDate status location images createdAt updatedAt userId')
      .exec();

    if (!bookings || bookings.length === 0) {
       res.status(404).json({
        success: false,
        message: "No bookings found for this service."
      });
    }

    // Format the bookings to include user details as nested object
    const formattedBookings = bookings.map(b => ({
      paymentStatus: b.paymentStatus,
      _id: b._id,
      serviceType: b.serviceType,
      serviceId: b.serviceId,
      serviceProviderId: b.serviceProviderId,
      bookingDate: b.bookingDate,
      status: b.status,
      location: b.location,
      images: b.images,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      user: b.userId && typeof b.userId === 'object' ? {
        id: (b.userId as any)._id,
        name: (b.userId as any).name,
        email: (b.userId as any).email,
      } : b.userId ? {
        id: b.userId,
        name: undefined,
        email: undefined,
      } : null,
    }));

    res.status(200).json({
      success: true,
      data: formattedBookings,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
      errorMessages: error instanceof Error ? error.message : error,
    });
  }
};



export const getBookingsByServiceId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceId } = req.params;

    if (!serviceId) {
       res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Service ID is required."
      });
    }

    // Validate serviceId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
       res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid service ID format."
      });
    }

    // Query bookings for the valid serviceId
    const bookings = await Booking.find({ serviceId })
      .populate('userId', 'name email contactNumber')
      .populate('serviceProviderId', 'name email profile')
      .exec();

    if (!bookings || bookings.length === 0) {
       res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "No bookings found for this service."
      });
    }

     res.status(StatusCodes.OK).json({
      success: true,
      data: bookings
    });
    
  } catch (error: any) {
    console.error("Error fetching bookings by serviceId:", error);
     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred while fetching bookings for the service.",
      error: error.message || "Internal server error"
    });
  }
};

export const getTotalBookingsCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalBookings = await Booking.countDocuments();
    const totalUsers = await User.countDocuments();

    const totalEarningsAgg = await Booking.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, totalEarnings: { $sum: "$price" } } }
    ]);

    const totalEarnings = totalEarningsAgg.length > 0 ? totalEarningsAgg[0].totalEarnings : 0;

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        totalBookings,
        totalUsers,
        totalEarnings,  // now a number, not array
      }
    });
  } catch (error: any) {
    console.error('Error fetching total bookings count:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch total bookings count',
      errorMessages: error.message || String(error),
    });
  }
};

//get monthly earning
export const getMonthlyEarnings = async (req: Request, res: Response) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();

    const aggregation = await Booking.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          createdAt: {
            $gte: new Date(`${year}-01-01T00:00:00Z`),
            $lt: new Date(`${year + 1}-01-01T00:00:00Z`),
          },
        },
      },
      {
        $group: {
          _id: { month: { $month: "$createdAt" } },
          totalEarnings: { $sum: "$price" },
        },
      },
    ]);

    // Month names with initial zero earnings
    const months = [
      { month: "Jan", earnings: 0 },
      { month: "Feb", earnings: 0 },
      { month: "Mar", earnings: 0 },
      { month: "Apr", earnings: 0 },
      { month: "May", earnings: 0 },
      { month: "Jun", earnings: 0 },
      { month: "Jul", earnings: 0 },
      { month: "Aug", earnings: 0 },
      { month: "Sept", earnings: 0 },
      { month: "Oct", earnings: 0 },
      { month: "Nov", earnings: 0 },
      { month: "Dec", earnings: 0 },
    ];

    // Fill earnings from aggregation
    aggregation.forEach(({ _id, totalEarnings }) => {
      const monthIndex = _id.month - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        months[monthIndex].earnings = totalEarnings;
      }
    });

    // Calculate total earnings for the year
    const totalEarnings = months.reduce((acc, m) => acc + m.earnings, 0);

    res.status(StatusCodes.OK).json({
      status: "success",
      data: months,
      totalEarnings,
    });
  } catch (error: any) {
    console.error("Error fetching monthly earnings:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: "error",
      message: error.message || "Internal server error",
    });
  }
};

export const getMonthlyUserStats = async (req: Request, res: Response) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();

    // Aggregate counts grouped by month and role
    const aggregation = await User.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${year}-01-01T00:00:00Z`),
            $lt: new Date(`${year + 1}-01-01T00:00:00Z`),
          },
        },
      },
      {
        $group: {
          _id: { month: { $month: "$createdAt" }, role: "$role" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Month names exactly as you want
    const months = [
      { month: "Jan", user: 0, provider: 0 },
      { month: "Feb", user: 0, provider: 0 },
      { month: "Mar", user: 0, provider: 0 },
      { month: "Apr", user: 0, provider: 0 },
      { month: "May", user: 0, provider: 0 },
      { month: "Jun", user: 0, provider: 0 },
      { month: "Jul", user: 0, provider: 0 },
      { month: "Aug", user: 0, provider: 0 },
      { month: "Sept", user: 0, provider: 0 }, // notice "Sept" instead of "Sep"
      { month: "Oct", user: 0, provider: 0 },
      { month: "Nov", user: 0, provider: 0 },
      { month: "Dec", user: 0, provider: 0 },
    ];

    aggregation.forEach(({ _id, count }) => {
      const monthIndex = _id.month - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        if (_id.role === "USER") {
          months[monthIndex].user = count;
        } else if (_id.role === "ADMIN") {
          months[monthIndex].provider = count;
        }
      }
    });

    // Optionally calculate totals
    const totalUsers = months.reduce((acc, m) => acc + m.user, 0);
    const totalProviders = months.reduce((acc, m) => acc + m.provider, 0);

    res.status(StatusCodes.OK).json({
      status: "success",
      data: months,
      totalUsers,
      totalProviders,
    });
  } catch (error: any) {
    console.error("Error fetching monthly user stats:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: "error",
      message: error.message || "Internal server error",
    });
  }
};

export const getMonthlyBookingStats = async (req: Request, res: Response) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();

    const aggregation = await Booking.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${year}-01-01T00:00:00Z`),
            $lt: new Date(`${year + 1}-01-01T00:00:00Z`),
          },
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Prepare array for all 12 months with count default to 0
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      x: i + 1,
      y: 0,
    }));

    aggregation.forEach(({ _id, count }) => {
      if (_id >= 1 && _id <= 12) {
        monthlyData[_id - 1].y = count;
      }
    });

    const total = monthlyData.reduce((acc, curr) => acc + curr.y, 0);

    res.status(StatusCodes.OK).json({
      status: "success",
      data: monthlyData,
      total,
    });
  } catch (error: any) {
    console.error("Error fetching monthly booking stats:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: "error",
      message: error.message || "Internal server error",
    });
  }
};


// export const cancelBooking = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const bookingId = req.params.id;
//     const userId = req.user?.id;
//     const userRole = req.user?.role;

//     if (!userId) {
//        res.status(401).json({ success: false, message: 'Unauthorized: User not found in token' });
//     }

//     const booking = await Booking.findOne({ bookingId: bookingId });

//     if (!booking) {
//        res.status(404).json({ success: false, message: 'Booking not found' });
//     return;
//       }

//     // Check if the booking is already cancelled
//     if (booking.status === 'Cancelled') {
//       console.log('Booking already cancelled:', booking);
//        res.status(400).json({ success: false, message: 'This booking has already been cancelled.' });
//     }

//     const isUserBookingOwner = booking.userId.toString() === userId;
//     const isAdmin = userRole === USER_ROLES.ADMIN || userRole === USER_ROLES.USER;

//     if (!isUserBookingOwner && !isAdmin) {
//        res.status(403).json({ success: false, message: 'You are not authorized to cancel this booking' });
//     }

//     // Updating the booking status instead of creating a new booking object
//     booking.status = 'Cancelled'; 
//     await booking.save();  // Ensure this updates the same document (booking) in the database

//     const notificationText = `Booking on ${new Date(booking.bookingDate).toLocaleDateString()} has been cancelled`;

//     const notification = new Notification({
//       text: notificationText,
//       receiver: isUserBookingOwner ? booking.serviceProviderId : booking.userId,
//       sender: userId,
//       referenceId: booking._id.toString(),
//       screen: 'BOOKING',
//       read: false,
//       type: isAdmin ? 'USER' : 'ADMIN',
//     });

//     await notification.save();

//  const io = global.io;
//     io.emit(`cancelled::${notification.receiver}`, {
//       text: notificationText,
//       type: 'Booking Cancelled',
//       bookingId: booking._id,
//       createdAt: notification.createdAt,
//     });

//     // Ensure that this is the final response
//      res.status(200).json({
//       success: true,
//       message: 'Booking cancelled successfully',
//       data: booking,  // The same booking should be returned here
//     });
//   } catch (error: any) {
//     console.error(error);
//     if (!res.headersSent) {  // Check if headers are already sent before sending an error response
//        res.status(500).json({
//         success: false,
//         message: 'Error cancelling booking',
//         errorMessages: error.message || error,
//       });
//     }
//   }
// };

//remove booking only status pending

export const cancelBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const bookingId = req.params.id;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
       res.status(401).json({ success: false, message: 'Unauthorized: User not found in token' });
    }

    const booking = await Booking.findOne({ bookingId });

    if (!booking) {
       res.status(404).json({ success: false, message: 'Booking not found' });
       return;
    }

    const isUserBookingOwner = booking.userId.toString() === userId;
    const isAdmin = userRole === USER_ROLES.USER;

    if (!isUserBookingOwner && !isAdmin) {
       res.status(403).json({ success: false, message: 'You are not authorized to delete this booking' });
    }

    if (booking.status !== 'Pending') {
       res.status(400).json({ success: false, message: 'Only pending bookings can be deleted.' });
    }

    // ✅ Correct deletion
    await Booking.findOneAndDelete({ bookingId });

    // Optional: Create and send notification
    const notificationText = `Pending booking on ${new Date(booking.bookingDate).toLocaleDateString()} has been removed`;

    const notification = new Notification({
      text: notificationText,
      receiver: isUserBookingOwner ? booking.serviceProviderId : booking.userId,
      sender: userId,
      referenceId: booking._id.toString(),
      screen: 'BOOKING',
      read: false,
      type: isAdmin ? 'ADMIN' : 'USER',
    });

    await notification.save();

    const io = global.io;
    io.emit(`deleted::${notification.receiver}`, {
      text: notificationText,
      type: 'Booking Deleted',
      bookingId: booking._id,
      createdAt: notification.createdAt,
    });

     res.status(200).json({
      success: true,
      message: 'Pending booking deleted successfully',
    });
  } catch (error: any) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error deleting booking',
        errorMessages: error.message || error,
      });
    }
  }
};


export const getUserEarnings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId || req.query.userId;
    const year = Number(req.query.year) || new Date().getFullYear();

    if (!userId) {
       res.status(StatusCodes.BAD_REQUEST).json({
        status: "error",
        message: "Missing userId in query or params",
      });
    }

    const startOfYear = new Date(`${year}-01-01T00:00:00Z`);
    const startOfNextYear = new Date(`${year + 1}-01-01T00:00:00Z`);

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // 1. Monthly earnings aggregation
    const monthlyAggregation = await Booking.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          serviceProviderId: new mongoose.Types.ObjectId(
            Array.isArray(userId)
              ? String(userId[0])
              : typeof userId === 'object'
                ? String((userId as any).toString ? (userId as any).toString() : '')
                : String(userId)
          ),
          createdAt: {
            $gte: startOfYear,
            $lt: startOfNextYear,
          },
        },
      },
      {
        $group: {
          _id: { month: { $month: "$createdAt" } },
          totalEarnings: { $sum: "$price" },
        },
      },
    ]);

    //tips
    const tipsAggregation = await Booking.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          serviceProviderId: new mongoose.Types.ObjectId(
            Array.isArray(userId)
              ? String(userId[0])
              : typeof userId === 'object'
                ? String((userId as any).toString ? (userId as any).toString() : '')
                : String(userId)
          ),
          createdAt: {
            $gte: startOfYear,
            $lt: startOfNextYear,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalTips: { $sum: "$tip" },
        },
      },
    ]);

    // 2. Today's earnings aggregation
    const todayAggregation = await Booking.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          serviceProviderId: new mongoose.Types.ObjectId( Array.isArray(userId)
              ? String(userId[0])
              : typeof userId === 'object'
                ? String((userId as any).toString ? (userId as any).toString() : '')
                : String(userId)),
          createdAt: {
            $gte: startOfToday,
            $lt: endOfToday,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: "$price" },
        },
      },
    ]);

    const months = [
      { month: "Jan", earnings: 0 },
      { month: "Feb", earnings: 0 },
      { month: "Mar", earnings: 0 },
      { month: "Apr", earnings: 0 },
      { month: "May", earnings: 0 },
      { month: "Jun", earnings: 0 },
      { month: "Jul", earnings: 0 },
      { month: "Aug", earnings: 0 },
      { month: "Sept", earnings: 0 },
      { month: "Oct", earnings: 0 },
      { month: "Nov", earnings: 0 },
      { month: "Dec", earnings: 0 },
    ];

    monthlyAggregation.forEach(({ _id, totalEarnings }) => {
      const index = _id.month - 1;
      if (index >= 0 && index < 12) {
        months[index].earnings = totalEarnings;
      }
    });

    const totalEarnings = months.reduce((sum, m) => sum + m.earnings, 0);
    const todayEarnings = todayAggregation[0]?.totalEarnings || 0;
    const totalTips = tipsAggregation[0]?.totalTips || 0;

    res.status(StatusCodes.OK).json({
      status: "success",
      data: {
        year,
        // monthlyEarnings: months,
        totalEarnings,
        todayEarnings,
        totalTips,
      },
    });
  } catch (error: any) {
    console.error("Error in getUserEarnings:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: "error",
      message: error.message || "Internal server error",
    });
  }
};


// total services status waised count like pending, accepted, completed, cancelled
 

const getBookingStatusSummary = async (req: Request, res: Response): Promise<void>=> {
  try {
    console.log("User ID:", req.user.id); // Log the user ID for debugging
    const statusAggregation = await Booking.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const defaultStatusSummary: Record<string, number> = {
      Pending: 0,
      Accepted: 0,
      Completed: 0,
      Cancelled: 0,
    };

    statusAggregation.forEach(({ _id, count }) => {
      if (_id in defaultStatusSummary) {
        defaultStatusSummary[_id] = count;
      }
    });
    // const allStatus = await Promise.all(["Pending", "Accepted", "Cancelled", "Completed"].map(
    //     async (status: string) => {
    //         return {
    //             status: await Booking.countDocuments({ serviceProviderId: req.user.id, status: status })
    //         }
    //     })
    // );
    // console.log("All Status Counts:", allStatus);

    res.status(StatusCodes.OK).json({
      status: "success",
      data: defaultStatusSummary
    });

  } catch (error: any) {
    console.error("Error in getBookingStatusSummary:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: "error",
      message: error.message || "Internal server error",
    });
  }
};

 const getBookingStatusSummaryDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;

    // Get all status counts
    const statusAggregation = await Booking.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const defaultStatusSummary: Record<string, number> = {
      Pending: 0,
      Accepted: 0,
      Completed: 0,
      Cancelled: 0,
    };

    statusAggregation.forEach(({ _id, count }) => {
      if (_id in defaultStatusSummary) {
        defaultStatusSummary[_id] = count;
      }
    });

    // If status query is provided, return filtered bookings
    let filteredBookings = [];
    if (status && typeof status === "string" && status in defaultStatusSummary) {
      filteredBookings = await Booking.find({ status }).sort({ createdAt: -1 })
        // .populate('serviceProviderId')
        .populate('serviceId', 'serviceName price serviceDescription image category location totalRating')
        .populate('userId', 'reviews name email contactNumber')
        .exec();
    } else {
      // Otherwise return all bookings
      filteredBookings = await Booking.find().sort({ createdAt: -1 })
        .populate('serviceId', 'serviceName price serviceDescription image category location totalRating')
        .populate('userId', 'reviews name email contactNumber')
        .exec();
    }

    res.status(StatusCodes.OK).json({
      status: "success",
      data: {
        summary: defaultStatusSummary,
        bookings: filteredBookings,
      },
    });
  } catch (error: any) {
    console.error("Error in getBookingStatusSummary:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: "error",
      message: error.message || "Internal server error",
    });
  }
};


export const BookingController = {
  createBooking,
  getUserBookings,
  getBookingsByServiceId,
  getBookingById,
  updateBookingStatus,
  getServiceBookingsWithUser,
  getTotalBookingsCount,
  getMonthlyBookingStats,
  getMonthlyUserStats,
  getAllBookings,
  getMonthlyEarnings,
  getBookingLocation,
  cancelBooking,
  getUserBookingsById,
  getUserEarnings,
  getBookingStatusSummary,
  getBookingStatusSummaryDetails
  
  
};


