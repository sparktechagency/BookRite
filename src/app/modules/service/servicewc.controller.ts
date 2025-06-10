import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ServiceWcServices } from './servicewc.service';
import ApiError from '../../../errors/ApiError';
import { Review } from '../review/review.model';
import { User } from 'mercadopago';

// const createServiceWc = catchAsync(async (req: Request, res: Response) => {
//     const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
//     if (!files || !files.image || !files.image[0]) {
//       throw new ApiError(StatusCodes.BAD_REQUEST, "Image is required");
//     }

//     const imagePath = `/uploads/images/${files.image[0].filename}`;
    
//     const data = {
//       serviceName: req.body.serviceName,
//       serviceDescription: req.body.serviceDescription,
//       category: req.body.category,
//       price: req.body.price,
//       Review: req.body.Review,
//       reviews: req.body.reviews || [],
//       image: imagePath,
//       User: req.body.User,
//       createdAt: new Date(),
//       updatedAt: new Date(),
//     };
    
//     const result = await ServiceWcServices.createServiceToDB(data);
    
//     sendResponse(res, {
//       success: true,
//       statusCode: StatusCodes.OK,
//       message: 'Service created successfully',
//       data: result,
//     });
//   });

const createServiceWc = catchAsync(async (req: Request, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  if (!files || !files.image || !files.image[0]) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Image is required");
  }

  const imagePath = `/uploads/images/${files.image[0].filename}`;


  const userId = (req as any).user?.id || req.body.User; // fallback to body if you want

  if (!userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "User is required");
  }

  const data = {
    serviceName: req.body.serviceName,
    serviceDescription: req.body.serviceDescription,
    category: req.body.category,
    price: req.body.price,
    reviews: req.body.reviews || [],
    image: imagePath,
    User: userId,
    location: req.body.location,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await ServiceWcServices.createServiceToDB(data, userId);
  const resultObj = { ...result, serviceProviderId: (result as any).User };
  delete (resultObj as any).User;
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service created successfully',
    data: resultObj,
  });
});

const getServiceWcs = catchAsync(async (req: Request, res: Response) => {
  const result = await ServiceWcServices.getServicesFromDB(req);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Services retrieved successfully',
    data: result,
  });
});

const getHighestRated = catchAsync(async (req: Request, res: Response) => {
  const result = await ServiceWcServices.getHighestRatedServices();
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Highest rated services retrieved successfully',
    data: result,
  });
});

// 
const getServicesByAdminId = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;

  // Optional: you could validate if adminId belongs to an admin user here before fetching services

  const result = await ServiceWcServices.getServicesByAdminIdFromDB(userId, req);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: `Services created by admin ${userId} retrieved successfully`,
    data: result,
  });
});


const updateServiceWc = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const updateData = req.body;

  let image;
  if (req.files && "image" in req.files && req.files.image[0]) {
    image = `/images/${req.files.image[0].filename}`;
  }
  const data = {
    ...updateData,
    image,
  };

  const result = await ServiceWcServices.updateServiceToDB(id, data);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service updated successfully',
    data: result,
  });
});

const deleteServiceWc = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await ServiceWcServices.deleteServiceToDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service deleted successfully',
    data: result,
  });
});

export const ServiceWcController = {
  createServiceWc,
  getServiceWcs,
  updateServiceWc,
  deleteServiceWc,
  getHighestRated,
  getServicesByAdminId
};
