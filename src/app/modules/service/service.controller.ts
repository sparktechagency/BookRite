import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../../shared/catchAsync'
import sendResponse from '../../../shared/sendResponse'
import { ServiceServices } from './service.service'

const createService = catchAsync(async (req: Request, res: Response) => {
  const serviceData = req.body;
  
  let image = "";
  if (req.files && "image" in req.files && req.files.image[0]) {
    image = `/uploads/images/${req.files.image[0].filename}`;
  }
  const data = {
    ...serviceData,
    image,
  };

  const result = await ServiceServices.createServiceToDB(data)

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service create successfully',
    data: result,
  })
})

const getServices = catchAsync(async (req: Request, res: Response) => {
  const result = await ServiceServices.getServicesFromDB(req);
 //sorting by createdAt in descending order
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service retrieved successfully',
    data: result,
  })
})

const updateService = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id
  const updateServiceData = req.body;

  let image;
  if (req.files && "image" in req.files && req.files.image[0]) {
    image = `/images/${req.files.image[0].filename}`;
  }
  const data = {
    ...updateServiceData,
    image
  };

  const result = await ServiceServices.updateServiceToDB(id, data)

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service updated successfully',
    data: result,
  })
})

const deleteService = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id
  const result = await ServiceServices.deleteServiceToDB(id)

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service delete successfully',
    data: result,
  })
})

const getServiceByCategory = catchAsync(async (req: Request, res: Response) => {
  const service = req.params.serviceId
  const result = await ServiceServices.getServiceByCategoryFromDB(service)

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service Retrieved by Service Category successfully',
    data: result,
  })
})

export const ServiceController = {
  createService,
  getServices,
  updateService,
  deleteService,
  getServiceByCategory
}
