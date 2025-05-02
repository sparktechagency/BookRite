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

// Controller to handle booking creation
// const createBooking = async (req: Request, res: Response): Promise<void> => {
//     try {
//       const { serviceType, serviceId, serviceProviderId, bookingDate, location, images, contactNumber } = req.body;
  
//       if (!serviceType || !serviceId || !bookingDate || !location || !contactNumber) {
//         res.status(400).json({
//           success: false,
//           message: "Please provide all the required fields (serviceType, userId, bookingDate, location)."
//         });
//         return;
//       }
  
//       const validServiceTypes = [
//         'Home Service', 'Washing', 'Plumbing', 'Painting', 'Electrician', 'Cleaning', 'Handyman', 'Gardening',
//         'Removalists', 'IT', 'Car Mechanic', 'AC Technician'
//       ];
  
//       if (!validServiceTypes.includes(serviceType)) {
//         res.status(400).json({
//           success: false,
//           message: "Invalid service type."
//         });
//         return;
//       }
  
//       const newBooking = new Booking({
//         serviceType,
//         serviceId,
//         serviceProviderId,
//         bookingDate,
//         location,
//         contactNumber,
//         images: images || []
//       });
  
//       await newBooking.save();
  
//       res.status(201).json({
//         success: true,
//         message: "Booking created successfully.",
//         data: newBooking
//       });
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({
//         success: false,
//         message: "Error creating booking",
//         errorMessages: error
//       });
//     }
//   };
const createBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceType, serviceId, userId, bookingDate, location, images, contactNumber, serviceProviderId } = req.body;

    const serviceProvider = await User.findById(serviceProviderId);
    if (serviceProvider?.role !== 'ADMIN') {
       res.status(400).json({
        success: false,
        message: 'Service provider must be an admin',
      });
    }

    const service = await Servicewc.findById(serviceId);
    if (!service) {
       res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }
    if (!serviceType || !serviceId || !bookingDate || !location || !contactNumber) {
      res.status(400).json({
        success: false,
        message: 'Please provide all the required fields (serviceType, userId, bookingDate, location).',
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

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: newBooking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error creating booking',
      errorMessages: error,
    });
  }
};


const getBookingById = async (bookingId: string) => {
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Booking not found');
  }

  return booking;
};  
  
const getUserBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user._id; 


    const bookings = await Booking.find({ userId })
      .populate('serviceProviderId') 
      .populate('serviceId', 'serviceName serviceDescription price category image') 
      .populate('userId', 'name email') 
      .exec();

    if (!bookings || bookings.length === 0) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'No bookings found for this user.');
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
  getBookingById
};
    function next() {
        throw new Error("Function not implemented.");
    }

