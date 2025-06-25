import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { IWcService } from './servicewc.interface';
import { Servicewc } from './serviceswc.model';
import unlinkFile from '../../../shared/unlinkFile';
import { query } from 'express';
import { Review } from '../review/review.model';
import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enums/user';
import { Bookmark } from '../bookmark/bookmark.model';
import { Request, Response, NextFunction } from 'express';
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

const createServiceToDB = async (payload: IWcService, userId: string): Promise<IWcService> => {

  const result = await Servicewc.create(payload);
  
  if (!result) {
    unlinkFile(payload.image);
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to create service');
  }

  const createdService = result.toObject();
  
  return createdService;
};

// The following controller code should be placed in your controller file, not in this service file.
// Example usage (move to controller):
// const createdService = await ServiceWcServices.createServiceToDB(payload, userId);
// res.status(StatusCodes.CREATED).json({
//   success: true,
//   message: 'Service created successfully',
//   data: createdService
// });

// const createServiceToDB = async (payload: IWcService) => {
//   const { serviceName, serviceDescription, category, image, price } = payload;

//   if (price === undefined || price === null || isNaN(price) || price <= 0) {
//     unlinkFile(image);
//     throw new ApiError(StatusCodes.BAD_REQUEST, 'Price is required and must be a positive number');
//   }

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

const getServicesFromDB = async (req: any) => {
  const { filter, search } = req.query;
  const userId = req.user?.id;

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
      path: 'userId',
      select: 'name _id',
    })
    
    .sort({ createdAt: -1 })
   
  // TODO: Apply filters/search here if needed

  const services = await query.exec();

  const serviceIds = services.map(service => service._id);

  // Bookmark counts (for everyone)
  const bookmarkCounts = await Bookmark.aggregate([
    {
      $match: { service: { $in: serviceIds } },
    },
    {
      $group: {
        _id: "$service",
        count: { $sum: 1 },
      },
    },
  ]);
  const bookmarkCountMap = new Map(
    bookmarkCounts.map(item => [item._id.toString(), item.count])
  );

  // ✅ Find which services the current user bookmarked
  let userBookmarkedIds = new Set<string>();
  if (userId) {
    const userBookmarks = await Bookmark.find({
      user: userId,
      service: { $in: serviceIds },
    }).select('service');

    userBookmarkedIds = new Set(
      userBookmarks.map(b => b.service.toString())
    );
  }

  // Build final response
const processedServices = services.map(service => {
  const obj: any = service.toObject();

  // Rename userId → serviceProvider
  if (obj.userId && typeof obj.userId === 'object') {
    obj.serviceProvider = {
      _id: obj.userId._id,
      name: obj.userId.name,
    };
  }

  // Remove raw userId field if not needed
  delete obj.userId;

  obj.bookmarkCount = bookmarkCountMap.get(service._id.toString()) || 0;
  obj.bookmark = userBookmarkedIds.has(service._id.toString());

  if (obj.reviews?.length > 0) {
    const ratings = obj.reviews.map((r: any) => +r.rating || 0);
    const totalRating = ratings.reduce((acc: number, cur: number) => acc + cur, 0);
    obj.rating = totalRating / ratings.length;
  } else {
    obj.rating = 0;
  }

  return obj;
});


  return processedServices;
};

// const getServicesFromDB = async (req: any) => {
//   const { filter, search } = req.query;

//   let query = Servicewc.find()
//     .populate({
//       path: 'category',
//       select: 'CategoryName price image -_id User',
//       populate: {
//         path: 'User',
//         select: 'name',
//       },
//     })
//     .populate({
//       path: 'User',
//       select: 'name _id',
//     })
//     .sort({ createdAt: -1 });

//   // ... (keep your existing search and filter logic)

//   const services = await query.exec();

//   // Get all service IDs for bookmark counting
//   const serviceIds = services.map(service => service._id);

//   // Count bookmarks for all services in one query
//   const bookmarkCounts = await Bookmark.aggregate([
//     {
//       $match: {
//         service: { $in: serviceIds }
//       }
//     },
//     {
//       $group: {
//         _id: "$service",
//         count: { $sum: 1 }
//       }
//     }
//   ]);

//   // Convert to a map for easy lookup
//   const bookmarkCountMap = new Map(
//     bookmarkCounts.map(item => [item._id.toString(), item.count])
//   );

//   // Process each service
//   const processedServices = services.map(service => {
//     const obj: any = service.toObject();

//     // Rename User to serviceProvider
//     if (obj.User) {
//       obj.serviceProvider = obj.User;
//       delete obj.User;
//     }

//     // Get bookmark count from our map (default to 0 if not found)
//     obj.bookmarkCount = bookmarkCountMap.get(service._id.toString()) || 0;

//     // Calculate average rating from reviews
//     if (obj.reviews && obj.reviews.length > 0) {
//       const ratings = obj.reviews.map((r: any) => r.rating || 0);
//       const totalRating = ratings.reduce((acc: number, cur: number) => acc + cur, 0);
//       obj.rating = totalRating / ratings.length;
//     } else {
//       obj.rating = 0;
//     }

//     return obj;
//   });

//   return processedServices;
// };

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

//  const getHighestRatedServices = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const limit = parseInt(req.query.limit as string) || 5;

//     let query = Servicewc.find()
//       .populate({
//         path: 'category',
//         select: 'CategoryName price image -_id User',
//         populate: {
//           path: 'User',
//           select: 'name',
//         },
//       })
//       .populate({
//         path: 'User',
//         select: 'name _id',
//       })
//       .sort({ createdAt: -1 })
//       .sort({ 'reviews.rating': -1 }) // this overrides the earlier sort, so keep only one if needed
//       .limit(limit);

//     const services = await query.exec();

//     const processedServices = services.map(service => {
//       const obj: any = service.toObject();

//       // Rename User to serviceProvider
//       if (obj.User) {
//         obj.serviceProvider = obj.User;
//         delete obj.User;
//       }

//       obj.bookmarkCount = obj.Bookmark ? 1 : 0;
//       delete obj.Bookmark;

//       // Calculate average rating from reviews
//       if (obj.reviews && obj.reviews.length > 0) {
//         const ratings = obj.reviews.map((r: any) => r.rating || 0);
//         const totalRating = ratings.reduce((acc: number, cur: number) => acc + cur, 0);
//         obj.rating = totalRating / ratings.length;
//       } else {
//         obj.rating = 0;
//       }

//       res.send(obj);
//     });

//     // ✅ Send response
//      res.status(200).json({
//       success: true,
//       message: 'Top rated services retrieved successfully',
//       data: processedServices,
//     });
//   } catch (error) {
//     // ✅ Proper error response
//      res.status(500).json({
//       success: false,
//       message: 'Failed to fetch top-rated services',
//       error: error instanceof Error ? error.message : error,
//     });
//   }
// };

const getHighestRatedServices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const userId = req.user?.id;

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
    path: 'userId',
    select: 'name _id',
  });

    const services = await query.exec();

 const servicesWithRating = services.map(service => {
  const obj: any = service.toObject();

  // 👇 Replace with correct mapping
  if (obj.userId) {
    obj.serviceProvider = obj.userId;
  }

      let rating = 0;
      if (obj.reviews && obj.reviews.length > 0) {
        const ratings = obj.reviews.map((r: any) => r.rating || 0);
        const totalRating = ratings.reduce((acc: number, cur: number) => acc + cur, 0);
        rating = totalRating / ratings.length;
      }

      obj.rating = rating;
      return obj;
    });

    // ✅ Sort by rating and apply limit
    const sortedServices = servicesWithRating
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);

    const serviceIds = sortedServices.map(s => s._id);

    // ✅ Get bookmark counts
    const bookmarkCounts = await Bookmark.aggregate([
      { $match: { service: { $in: serviceIds } } },
      { $group: { _id: "$service", count: { $sum: 1 } } },
    ]);

    const bookmarkCountMap = new Map(
      bookmarkCounts.map(item => [item._id.toString(), item.count])
    );

    // ✅ Check which services the user has bookmarked
    let userBookmarkedIds = new Set<string>();
    if (userId) {
      const userBookmarks = await Bookmark.find({
        user: userId,
        service: { $in: serviceIds },
      }).select('service');

      userBookmarkedIds = new Set(
        userBookmarks.map(b => b.service.toString())
      );
    }

    // ✅ Finalize processed services
    const processedServices = sortedServices.map(service => {
      const obj: any = service;
      obj.bookmarkCount = bookmarkCountMap.get(service._id.toString()) || 0;
      obj.bookmark = userBookmarkedIds.has(service._id.toString());
      return obj;
    });

    res.status(200).json({
      success: true,
      message: 'Top rated services retrieved successfully',
      data: processedServices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top-rated services',
      error: error instanceof Error ? error.message : error,
    });
  }
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
