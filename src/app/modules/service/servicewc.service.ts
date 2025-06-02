import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { IWcService } from './servicewc.interface';
import { Servicewc } from './serviceswc.model';
import unlinkFile from '../../../shared/unlinkFile';
import { query } from 'express';
import { Review } from '../review/review.model';
import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enums/user';

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



// const getServicesFromDB = async (req: any) => {
//   const { filter, search } = req.query;
//   let query = Servicewc.find().populate({
//     path: 'category',
//     select: 'CategoryName price image -_id User',
//     populate: {
//       path: 'User',
//       select: 'name',
//     },
//   }).populate({
//     path: 'User',
//     select: 'name -_id serviceProviderId',
//   });


//   if (search) {
//     const searchTerm = search.toLowerCase();
//     query = query.find({
//       serviceName: { $regex: searchTerm, $options: 'i' },
//     });
//   }

//   if (filter) {
//     const { minPrice, maxPrice, rating } = filter;
//     if (minPrice || maxPrice || rating) {
//       query = query.find({
//         price: { $gte: minPrice || 0, $lte: maxPrice || Infinity },
//         rating: { $gte: rating || 0 },
//       });
//     }
//   }

//   // Execute the query and return results
//   const services = await query.exec();
//   return services;
// };
const getServicesFromDB = async (req: any) => {
  const { filter, search } = req.query;

  let query = Servicewc.find()
    .populate({
      path: 'category',
      select: 'CategoryName price image -_id User',
      populate: {
        path: 'User',
        select: 'name',
      },
    })
    .populate({
      path: 'User',
      select: 'name _id',
    })
    .sort({ createdAt: -1 });

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

  const services = await query.exec();

  // Rename User field to serviceProvider
const processedServices = services.map(service => {
  const obj = service.toObject();
  if (obj.User) {
    (obj as any).serviceProvider = obj.User;
    delete obj.User;
  }
  return obj;
});


  return processedServices;
};
// get specific ADMIN services
const getServicesByAdminIdFromDB = async (userId: string, req: any) => {
  const { filter, search } = req.query;

  // First, verify the user is an ADMIN (optional but recommended)
  const adminUser = await User.findById(userId).select('role');
  if (!adminUser || (adminUser.role !== USER_ROLES.ADMIN && adminUser.role !== USER_ROLES.SUPER_ADMIN)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'User is not authorized as admin');
  }

  let query = Servicewc.find({ User: userId }) 
    .populate({
      path: 'category',
      select: 'CategoryName price image -_id User',
      populate: {
        path: 'User',
        select: 'name',
      },
    })
    .populate({
      path: 'User',
      select: 'name _id',
    })
    .sort({ createdAt: -1 });

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

  const services = await query.exec();

  // Rename User field to serviceProvider for better clarity
  const processedServices = services.map(service => {
    const obj = service.toObject();
    if (obj.User) {
      (obj as any).serviceProvider = obj.User;
      delete obj.User;
    }
    return obj;
  });

  return processedServices;
};

const getHighestRatedServices = async (limit: number = 5) => {
  // const { filter, search } = req.query;

  let query = Servicewc.find()
    .populate({
      //location services
      path: 'category',
      select: 'CategoryName price image -_id User',
      populate: {
        path: 'User',
        select: 'name',
      },
    })
    .populate({
      path: 'User',
      select: 'name _id',
    })
    .sort({ createdAt: -1 });

  query = query.sort({ 'reviews.rating': -1 }).limit(limit);
  const services = await query.exec();

  // Rename User field to serviceProvider
const processedServices = services.map(service => {
  const obj = service.toObject();
  if (obj.User) {
    (obj as any).serviceProvider = obj.User;
    delete obj.User;
  }
  return obj;
});


  return processedServices;
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
  getHighestRatedServices,
  getServicesByAdminIdFromDB
  
};
