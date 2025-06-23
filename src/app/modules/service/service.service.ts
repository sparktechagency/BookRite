import { StatusCodes } from 'http-status-codes'
import ApiError from '../../../errors/ApiError'
import { IService } from './service.interface'
import { Service } from './service.model'
import unlinkFile from '../../../shared/unlinkFile'
import { Post } from '../post/post.model'
import { IPost } from '../post/post.interface'
import { Bookmark } from '../bookmark/bookmark.model'
import { Servicewc } from './serviceswc.model'
import { IWcService } from './servicewc.interface'

const createServiceToDB = async (payload: IService) => {
  const { CategoryName, image } = payload;
  const isExistName = await Service.findOne({ CategoryName: CategoryName })

  if (isExistName) {
    unlinkFile(image);
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "This Service Name Already Exist");
  }

  const createService: any = await Service.create(payload)
  if (!createService) {
    unlinkFile(image);
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create Service')
  }

  return createService
}

// const getServicesFromDB = async (): Promise<IService[]> => {
//   const result = await Service.find({})
//    .sort({ createdAt: -1 })
//   return result;
// }
const getServicesFromDB = async (req: any): Promise<IService[]> => {
  const { filter, search } = req.query;
  let query = Service.find().populate({
 
    path: 'User',
    select: 'name -_id ,rating',
    populate: {
      path: 'User',
      select: 'name -_id',
    },
  });


  if (search) {
    const searchTerm = search.toLowerCase();
    query = query.find({
      CategoryName: { $regex: searchTerm, $options: 'i' },
    });
  }

  if (filter) {
    const filterArray = filter.split(',');
    query = query.find({
      CategoryName: { $in: filterArray },
    });
  }

    const result = await query;
    return result;
  }
const updateServiceToDB = async (id: string, payload: IService) => {
  const isExistService: any = await Service.findById(id);

  if (!isExistService) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Service doesn't exist");
  }

  if (payload.image) {
    unlinkFile(isExistService?.image);
  }
  if (payload.User) {
    unlinkFile(isExistService?.User);
  }

  const updateService = await Service.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  })

  return updateService
}

const deleteServiceToDB = async (id: string): Promise<IService | null> => {
  const deleteService = await Service.findByIdAndDelete(id)
  if (!deleteService) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Service doesn't exist")
  }
  return deleteService
}

// const getServiceByCategoryFromDB = async (service: string): Promise<IPost[]> => {


//   // find latest provider by rating
//   const services: any = await Post.find({category: service})
//     .sort({ createdAt: -1 })
//     .select("image title rating adult location")
//     .lean();

//   const result = await Promise.all(
//     services.map(async (item: any) => {
//       const isBookmark = await Bookmark.findOne({ service: item?._id });
//       return {
//         ...item,
//         bookmark: !!isBookmark, // Add bookmark field as a boolean
//       };
//     })
//   );

//   return result;
// }
const getServiceByCategoryFromDB = async (categoryId: string, userId?: string): Promise<IWcService[]> => {
  // Validate categoryId
  if (!categoryId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Category ID is required');
  }

  // Find services by category with basic fields
  const services = await Servicewc.find({ category: categoryId })
    .sort({ createdAt: -1 })
    .select('image serviceName rating location price category userId')
    .populate('category', 'CategoryName image')
    .lean();

  // If no services found, return empty array
  if (!services.length) {
    return [];
  }

  // Get bookmark status for each service (if userId provided)
  if (userId) {
    const serviceIds = services.map((service: { _id: any }) => service._id);
    const userBookmarks = await Bookmark.find({
      user: userId,
      service: { $in: serviceIds }
    }).lean();

    const bookmarkMap = new Map(
      userBookmarks.map(bookmark => [bookmark.service.toString(), true])
    );

    // Add bookmark status to each service
     services.map((service: { _id: { toString: () => string } }) => ({
      ...service,
      isBookmarked: bookmarkMap.has(service._id.toString())
    }));
  }

  return services.map((service: any) => ({
    ...service,
    isBookmarked: false
  }));
};

export const ServiceServices = {
  createServiceToDB,
  getServicesFromDB,
  updateServiceToDB,
  deleteServiceToDB,
  getServiceByCategoryFromDB
}
