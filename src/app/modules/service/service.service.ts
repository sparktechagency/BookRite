import { StatusCodes } from 'http-status-codes'
import ApiError from '../../../errors/ApiError'
import { IService } from './service.interface'
import { Service } from './service.model'
import unlinkFile from '../../../shared/unlinkFile'
import { Post } from '../post/post.model'
import { IPost } from '../post/post.interface'
import { Bookmark } from '../bookmark/bookmark.model'

const createServiceToDB = async (payload: IService) => {
  const { name, image } = payload;
  const isExistName = await Service.findOne({ name: name })

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

const getServicesFromDB = async (): Promise<IService[]> => {
  const result = await Service.find({})
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

const getServiceByCategoryFromDB = async (service: string): Promise<IPost[]> => {


  // find latest provider by rating
  const services: any = await Post.find({category: service})
    .sort({ createdAt: -1 })
    .select("image title rating adult location")
    .lean();

  const result = await Promise.all(
    services.map(async (item: any) => {
      const isBookmark = await Bookmark.findOne({ service: item?._id });
      return {
        ...item,
        bookmark: !!isBookmark, // Add bookmark field as a boolean
      };
    })
  );

  return result;
}

export const ServiceServices = {
  createServiceToDB,
  getServicesFromDB,
  updateServiceToDB,
  deleteServiceToDB,
  getServiceByCategoryFromDB
}
