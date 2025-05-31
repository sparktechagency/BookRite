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

import { Notification } from "../notification/notification.model"; 
import { USER_ROLES } from "../../../enums/user";
// const createBooking = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { serviceType, serviceId, bookingDate, location, images, contactNumber, serviceProviderId } = req.body;
//     const userId = req.user?.id;

//     if (!userId) {
//       res.status(401).json({ success: false, message: 'Unauthorized: User not found in token' });
//       return;
//     }

//     if (!serviceType || !serviceId || !bookingDate || !location || !contactNumber || !serviceProviderId) {
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
//       serviceType,
//       serviceId,
//       userId,
//       serviceProviderId,
//       bookingDate,
//       location,
//       contactNumber,
//       images: images || [],
//     });

//     await newBooking.save();

//     // Create notification text (customize as needed)
//     const notificationText = `New booking for ${service.serviceName} on ${new Date(bookingDate).toLocaleDateString()}`;

//     // Create Notification document
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

//     // Reload notification to get createdAt field
//     const savedNotification = await Notification.findById(notification._id);

//     io.to(serviceProviderId.toString()).emit('new_notification', {
//       notificationId: notification._id,
//       text: notificationText,
//       bookingId: newBooking._id,
//       createdAt: savedNotification ? (savedNotification as any).createdAt : undefined,
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
    const { serviceId, bookingDate, location, images, contactNumber, serviceProviderId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized: User not found in token' });
      return;
    }

    if ( !serviceId || !bookingDate || !location || !contactNumber || !serviceProviderId) {
      res.status(400).json({
        success: false,
        message: 'Please provide all required fields: serviceType, serviceId, bookingDate, location, contactNumber, serviceProviderId',
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

    const newBooking = new Booking({
      serviceId,
      userId,
      serviceProviderId,
      bookingDate,
      location,
      contactNumber,
      images: images || [],
    });

    await newBooking.save();

    const notificationText = `New booking for ${service.serviceName} on ${new Date(bookingDate).toLocaleDateString()}`;

    const notification = new Notification({
      text: notificationText,
      receiver: serviceProviderId,
      sender: userId,
      referenceId: newBooking._id.toString(),
      screen: 'OFFER',    
      read: false,
      type: 'ADMIN',
    });

    await notification.save();

    const savedNotification = await Notification.findById(notification._id);

    // Emit notification to the serviceProvider room (userId)
    // const io = getIO();
    // io.to(serviceProviderId.toString()).emit('new_notification', {
    //   notificationId: notification._id,
    //   text: notificationText,
    //   bookingId: newBooking._id,
    //   createdAt: savedNotification ? (savedNotification as any).createdAt : undefined,
    // });
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
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error creating booking',
      errorMessages: error.message || error,
    });
  }
};

const getBookingById = async (bookingId: string) => {
 const booking = await Booking.findById(bookingId)
  .sort({ createdAt: -1 })
 .populate('userId', 'name email contactNumber');

  if (!booking) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Booking not found');
  }

  return booking;
};  

const updateBookingStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const { status, paymentStatus } = req.body;

    // Validate required params
    if (!bookingId) {
       res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Booking ID is required',
      });
    }
    if (!status && !paymentStatus) {
       res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Please provide status or paymentStatus to update',
      });
    }

    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
       res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Booking not found',
      });
      
      return;
    }

    // Update fields
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

const getUserBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
       res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Unauthorized: User not authenticated',
      });
    }

    const bookings = await Booking.find({ userId })
     .sort({ createdAt: -1 })
      .populate('serviceProviderId')
      .populate('serviceId', 'serviceName serviceDescription image category ')
      .populate('userId')
 
      .exec();

    if (!bookings || bookings.length === 0) {
       res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'No bookings found for this user.',
      });
    }

    // Map to clean format
    const formattedBookings = bookings.map(booking => ({
      bookingId: booking._id,
      serviceType: booking.serviceType,
      bookingDate: booking.bookingDate,
      location: booking.location,
      contactNumber: booking.contactNumber,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      images: booking.images || [],
      price: typeof booking.serviceId === 'object' && booking.serviceId !== null ? (booking.serviceId as any).price : 0,
      service: typeof booking.serviceId === 'object' && booking.serviceId !== null
        ? {
            id: (booking.serviceId as any)._id,
            name: (booking.serviceId as any).serviceName,
            description: (booking.serviceId as any).serviceDescription,
            image: (booking.serviceId as any).image,
            categoryId: (booking.serviceId as any).category,
          }
        : null,
      user: booking.userId
        ? {
            id:( booking.userId as any)._id,
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
      createdAt: (booking.createdAt),
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
      errorMessages: error.message || String(error),
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
  getBookingLocation
  
};
    function next() {
        throw new Error("Function not implemented.");
    }
