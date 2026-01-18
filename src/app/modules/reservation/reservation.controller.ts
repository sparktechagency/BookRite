import { Request, Response } from 'express';
import { getAllUserBookingsForAdminService } from './reservation.service';  // Import the service logic
import { StatusCodes } from 'http-status-codes';


export const getAllUserBookingsForAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = req.user?._id;  
    if (!adminId) {
       res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Unauthorized: Admin user not found',
      });
    }

    const bookings = await getAllUserBookingsForAdminService(adminId);

    // Return bookings data
    res.status(StatusCodes.OK).json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error fetching bookings',
      errorMessages: error || error,
    });
  }
};
