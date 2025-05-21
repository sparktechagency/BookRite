import { Booking } from '../booking/booking.model';  
import { Servicewc } from '../service/serviceswc.model';  
import  ApiError  from '../../../errors/ApiError';  
import { StatusCodes } from 'http-status-codes';


export const getAllUserBookingsForAdminService = async (adminId: string) => {

  const services = await Servicewc.find({ serviceProviderId: adminId });
  
  if (!services || services.length === 0) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'No services found for this admin');
  }

  const serviceIds = services.map(service => service._id);
  
  const bookings = await Booking.find({ serviceId: { $in: serviceIds } })
    .populate('userId', 'name email contactNumber')  
    .populate('serviceProviderId', 'name role') 
    .exec();

  if (!bookings || bookings.length === 0) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'No bookings found for this admin\'s services');
  }

  return bookings;
};
