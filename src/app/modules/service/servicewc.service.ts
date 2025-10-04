
import mongoose from 'mongoose';import { StatusCodes } from 'http-status-codes';
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


const getServicesByAdminIdFromDB = async (userId: string, req: any) => {
  const { filter: rawFilter, search: rawSearch } = req.query;

  // 1) Validate userId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid userId format');
  }
  const userObjId = new mongoose.Types.ObjectId(userId);

  // 2) Admin check (normalize casing)
  const adminUser = await User.findById(userId).select('role').lean();
  if (!adminUser) throw new ApiError(StatusCodes.NOT_FOUND, 'Admin user not found');
  const role = String(adminUser.role || '').toLowerCase();
  if (role !== String(USER_ROLES.ADMIN).toLowerCase() && role !== String(USER_ROLES.SUPER_ADMIN).toLowerCase()) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'User is not authorized as admin');
  }

  // 3) Parse filter (might be JSON string)
  let filter: any = {};
  if (rawFilter) {
    try {
      filter = typeof rawFilter === 'string' ? JSON.parse(rawFilter) : rawFilter;
    } catch (err) {
      // If you prefer to throw on bad filter, replace with throw
      console.warn('Failed to parse filter, ignoring it:', rawFilter);
      filter = {};
    }
  }

  // 4) Search term (escape regex special chars)
  const search = rawSearch ? String(rawSearch).trim() : null;
  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // 5) Build query. Query any of the possible user fields in your schema.
  //    Adjust the list if you add/remove fields later.
  const userFieldOr = [
    { User: userObjId },
    { userId: userObjId },
    { serviceProvider: userObjId },
  ];

  const mainMatch: any = { $or: userFieldOr };

  if (search) {
    const term = escapeRegex(search);
    // match serviceName (case-insensitive). Add more fields into $or if needed.
    mainMatch.$and = [
      { $or: [{ serviceName: { $regex: term, $options: 'i' } }] },
    ];
  }

  // 6) Price and rating filters
  if (filter) {
    const priceClause: any = {};
    if (filter.minPrice != null && !Number.isNaN(Number(filter.minPrice))) {
      priceClause.$gte = Number(filter.minPrice);
    }
    if (filter.maxPrice != null && !Number.isNaN(Number(filter.maxPrice))) {
      priceClause.$lte = Number(filter.maxPrice);
    }
    if (Object.keys(priceClause).length) {
      mainMatch.price = priceClause;
    }

    if (filter.rating != null && !Number.isNaN(Number(filter.rating))) {
      mainMatch.rating = { $gte: Number(filter.rating) };
    }
  }

  // 7) Execute query with populates (confirm populate paths exist)
  const services = await Servicewc.find(mainMatch)
    .populate({
      path: 'category',
      select: 'CategoryName price image -_id User',
      populate: { path: 'User', select: 'name' },
    })
    .populate({ path: 'User', select: 'name _id' })
    .populate({ path: 'serviceProvider', select: 'name _id' })
    .populate({ path: 'userId', select: 'name _id' })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  // 8) Normalize producer info => always return serviceProvider field
  const processed = services.map((svc: any) => {
    // prefer populated serviceProvider, then userId, then User
    if (!svc.serviceProvider) {
      if (svc.userId) svc.serviceProvider = svc.userId;
      else if (svc.User) svc.serviceProvider = svc.User;
    }
    // remove legacy fields to avoid confusion
    delete svc.User;
    delete svc.userId;
    return svc;
  });

  return processed;
};

const getHighestRatedServices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const userId = req.user?.id;

    let query = Servicewc.find()
      .populate('category', 'CategoryName price image') 
      .populate('userId', 'name _id rating');

    const services = await query.exec();

    const servicesWithRating = services.map(service => {
      const obj: any = service.toObject();

      const serviceProvider = obj.userId || null;
      obj.serviceProvider = serviceProvider; 

      let rating = 0;
      if (obj.reviews && obj.reviews.length > 0) {
        const ratings = obj.reviews.map((r: any) => r.rating || 0);
        const totalRating = ratings.reduce((acc: number, cur: number) => acc + cur, 0);
        rating = totalRating / ratings.length;
      }

      obj.rating = rating;
      return obj;
    });

    // ✅ Sort and limit
    const sortedServices = servicesWithRating
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);

    const serviceIds = sortedServices.map(s => s._id);

    // ✅ Get bookmark counts
    const bookmarkCounts = await Bookmark.aggregate([
      { $match: { service: { $in: serviceIds } } },
      { $group: { _id: '$service', count: { $sum: 1 } } },
    ]);
    const bookmarkCountMap = new Map(bookmarkCounts.map(item => [item._id.toString(), item.count]));

    // ✅ Get user bookmarks if logged in
    let userBookmarkedIds = new Set<string>();
    if (userId) {
      const userBookmarks = await Bookmark.find({
        user: userId,
        service: { $in: serviceIds },
      }).select('service');

      userBookmarkedIds = new Set(userBookmarks.map(b => b.service.toString()));
    }

    // ✅ Finalize
    const processedServices = sortedServices.map(service => {
      service.bookmarkCount = bookmarkCountMap.get(service._id.toString()) || 0;
      service.bookmark = userBookmarkedIds.has(service._id.toString());
      return service;
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
