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


// const createBooking = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { serviceType, serviceId, bookingDate, location, images, contactNumber, serviceProviderId } = req.body;

//     // Extract userId from authenticated user (assuming req.user is set by auth middleware)
//     const userId = req.user?.id;
//     if (!userId) {
//        res.status(401).json({
//         success: false,
//         message: 'Unauthorized: User not found in token',
//       });
//     }

//     // Validate required fields except userId (because it's from token)
//     if (!serviceType || !serviceId || !bookingDate || !location || !contactNumber || !serviceProviderId) {
//        res.status(400).json({
//         success: false,
//         message: 'Please provide all required fields: serviceType, serviceId, bookingDate, location, contactNumber, serviceProviderId',
//       });
//     }

//     // Check service provider
//     const serviceProvider = await User.findById(serviceProviderId);
//     if (!serviceProvider || serviceProvider.role !== 'ADMIN') {
//        res.status(400).json({
//         success: false,
//         message: 'Service provider must be an admin',
//       });
//     }

//     // Check service
//     const service = await Servicewc.findById(serviceId);
//     if (!service) {
//        res.status(404).json({
//         success: false,
//         message: 'Service not found',
//       });
//     }

//     // Create booking
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

//      res.status(201).json({
//       success: true,
//       message: 'Booking created successfully',
//       data: newBooking,
//     });
//   } catch (error: any) {
//     console.error(error);
//      res.status(500).json({
//       success: false,
//       message: 'Error creating booking',
//       errorMessages: error.message || error,
//     });
//   }
// };
const createBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceType, serviceId, bookingDate, location, images, contactNumber, serviceProviderId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: User not found in token',
      });
      return;
    }

    if (!serviceType || !serviceId || !bookingDate || !location || !contactNumber || !serviceProviderId) {
      res.status(400).json({
        success: false,
        message: 'Please provide all required fields: serviceType, serviceId, bookingDate, location, contactNumber, serviceProviderId',
      });
      return;
    }

    const serviceProvider = await User.findById(serviceProviderId);
    if (!serviceProvider || serviceProvider.role !== 'ADMIN') {
      res.status(400).json({
        success: false,
        message: 'Service provider must be an admin',
      });
      return;
    }

    const service = await Servicewc.findById(serviceId);
    if (!service) {
      res.status(404).json({
        success: false,
        message: 'Service not found',
      });
      return;
    }

    const newBooking = new Booking({
      serviceType,
      serviceId,
      userId,
      serviceProviderId,
      bookingDate,
      location,
      contactNumber,
      images: images || [],
    });

    await newBooking.save();

    // Include the price from the service model in the response
    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        booking: newBooking,
        servicePrice: service.price, // <-- Added this line
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
 const booking = await Booking.findById(bookingId).populate('userId', 'name email contactNumber');

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
      .populate('serviceProviderId')
      .populate('serviceId', 'serviceName serviceDescription image category price')
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




//   const getAllBookings = async (req: Request, res: Response): Promise<void> => {
//     try {
//       // Extract user ID from the decoded JWT token
//       const token = req.headers.authorization?.split(' ')[1];
//       if (!token) {
//          res.status(401).json({
//           success: false,
//           message: "No token provided."
//         });
//         return;
//       }
  
//       const decoded = verifyToken(token); // Use a function to verify the token
  
//       // Fetch all bookings for the user
//       if (typeof decoded !== 'string' && 'id' in decoded) {
//         const bookings = await Booking.find({ userId: decoded.id }).populate('serviceId').populate('serviceProviderId').exec();
        
//         if (!bookings || bookings.length === 0) {
//            res.status(404).json({
//             success: false,
//             message: "No bookings found for this user."
//           });
//             return;
//         }

//         // Return the fetched bookings
//          res.status(200).json({
//           success: true,
//           data: bookings
//         });
//         return;
//       } else {
//          res.status(400).json({
//           success: false,
//           message: "Invalid token payload."
//         });
//       }
//     } catch (error) {
//       console.error("Error fetching bookings:", error);
//       res.status(500).json({
//         success: false,
//         message: "An error occurred while fetching the bookings.",
//         errorMessages: error
//       });
//     }
//   };
  
  const getSertviceById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { serviceId } = req.params; 
  
      
      if (!serviceId) {
         res.status(400).json({
          success: false,
          message: "Service ID is required."
        });
      }
  
      // Fetch all bookings for the service owner
      const bookings = await Booking.find({ serviceId })
        .populate('userId', 'name email')  // Populate the user who booked the service
        .populate('userId', 'name') 
        .exec();
  
      if (!bookings || bookings.length === 0) {
         res.status(404).json({
          success: false,
          message: "No bookings found for this service."
        });
      }
  
      // Return the bookings for the service owner
      res.status(200).json({
        success: true,
        data: bookings
      });
    } catch (error) {
      console.error("Error fetching service owner bookings:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching bookings for the service.",
        errorMessages: error
      });
    }
  };
  

export const BookingController = {
  createBooking,
  getUserBookings,
  getSertviceById,
  getBookingById,
  updateBookingStatus
};
    function next() {
        throw new Error("Function not implemented.");
    }

