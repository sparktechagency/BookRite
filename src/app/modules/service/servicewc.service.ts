import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { IWcService } from './servicewc.interface';
import { Servicewc } from './serviceswc.model';
import unlinkFile from '../../../shared/unlinkFile';
import { query } from 'express';
import { Review } from '../review/review.model';

// const createServiceToDB = async (payload: IWcService) => {
//   const { serviceName, serviceDescription, category ,image } = payload;

//   const isExist = await Servicewc.findOne({ serviceName, serviceDescription, category });

//   if (isExist) {
//     unlinkFile(image);
//     throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "This service name already exists");
//   }

//   const result = await Servicewc.create(payload);

//   if (!result) {
//     unlinkFile(image);
//     throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create service");
//   }

//   return result;
// };
const createServiceToDB = async (payload: IWcService) => {
  const { serviceName, serviceDescription, category, image, price } = payload;

  if (price === undefined || price === null || isNaN(price) || price <= 0) {
    unlinkFile(image);
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Price is required and must be a positive number');
  }

  const isExist = await Servicewc.findOne({ serviceName, serviceDescription, category });

  if (isExist) {
    unlinkFile(image);
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "This service name already exists");
  }

  const result = await Servicewc.create(payload);

  if (!result) {
    unlinkFile(image);
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create service");
  }

  return result;
};



const getServicesFromDB = async (req: any) => {
  const { filter, search } = req.query;
  let query = Servicewc.find().populate({
    path: 'category',
    select: 'CategoryName price image -_id User',
    populate: {
      path: 'User',
      select: 'name -_id',
    },
  }).populate({
    path: 'User',
    select: 'name -_id',
  });

  

  

  if (search) {
    const searchTerm = search.toLowerCase();
    query = query.find({
      serviceName: { $regex: searchTerm, $options: 'i' },
    });
  }

  if (filter) {
    const { minPrice, maxPrice, rating } = filter;
    if (minPrice || maxPrice || rating) {
      query = query.find({
        price: { $gte: minPrice || 0, $lte: maxPrice || Infinity },
        rating: { $gte: rating || 0 },
      });
    }
  }

  // Execute the query and return results
  const services = await query.exec();
  return services;
};

//get highest rated services
const getHighestRatedServices = async (limit: number = 5) => {
  const services = await Servicewc.find()
    .sort({ rating: -1 })
    .limit(limit)
    .populate({
      path: 'category',
      select: 'CategoryName price image -_id User',
      populate: {
        path: 'User',
        select: 'name -_id',
      },
    })
    .populate({
      path: 'User',
      select: 'name -_id',
    })
    .exec();
  return services;
};

const updateServiceToDB = async (id: string, payload: IWcService) => {
  const existingService = await Servicewc.findById(id);

  if (!existingService) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Service doesn't exist");
  }

  if (payload.image) {
    unlinkFile(existingService.image);
  }

  const updated = await Servicewc.findByIdAndUpdate(id, payload, { new: true });

  return updated;
};

const deleteServiceToDB = async (id: string): Promise<IWcService | null> => {
  const deleted = await Servicewc.findByIdAndDelete(id);

  if (!deleted) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Service doesn't exist");
  }

  return deleted;
};

export const ServiceWcServices = {
  createServiceToDB,
  getServicesFromDB,
  updateServiceToDB,
  deleteServiceToDB,
  getHighestRatedServices
  
};
