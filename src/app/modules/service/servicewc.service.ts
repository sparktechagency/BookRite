import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { IWcService } from './servicewc.interface';
import { Service } from './serviceswc.model';
import unlinkFile from '../../../shared/unlinkFile';

const createServiceToDB = async (payload: IWcService) => {
  const { serviceName, serviceDescription, category ,image } = payload;

  const isExist = await Service.findOne({ serviceName, serviceDescription, category });

  if (isExist) {
    unlinkFile(image);
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "This service name already exists");
  }

  const result = await Service.create(payload);

  if (!result) {
    unlinkFile(image);
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create service");
  }

  return result;
};

// const getServicesFromDB = async (): Promise<IWcService[]> => {
//   return await Service.find({});
// };
const getServicesFromDB = async () => {
  const services = await Service.find()
    .populate({
      path: 'category',
      select: 'CategoryName image -_id',  
    })
    .exec();
  
  return services;
};

const updateServiceToDB = async (id: string, payload: IWcService) => {
  const existingService = await Service.findById(id);

  if (!existingService) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Service doesn't exist");
  }

  if (payload.image) {
    unlinkFile(existingService.image);
  }

  const updated = await Service.findByIdAndUpdate(id, payload, { new: true });

  return updated;
};

const deleteServiceToDB = async (id: string): Promise<IWcService | null> => {
  const deleted = await Service.findByIdAndDelete(id);

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
};
