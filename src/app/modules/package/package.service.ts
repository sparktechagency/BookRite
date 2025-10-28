import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import { IPackage } from "./package.interface";
import { Package } from "./package.model";
import mongoose from "mongoose";
import { createSubscriptionProduct } from "../../../helpers/createSubscriptionProductHelper";
import stripe from "../../../config/stripe";


const createPackageToDB = async (payload: IPackage): Promise<IPackage | null> => {
  //when package exist update it but when not exist create it
  const isExistPackage: any = await Package.findOne({ title: payload.title });
  if (isExistPackage) {
    const result = await Package.findOneAndUpdate({ title: payload.title }, payload, {
      new: true,
      runValidators: true,
    });
    return result;
  } else {
    const result = await Package.create(payload);
    return result;
  }
};

const updatePackageToDB = async (
  id: string,
  payload: Partial<IPackage>
): Promise<IPackage | null> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid ID');
  }

  const isExistPackage: any = await Package.findById({ _id: id });
  if (!isExistPackage) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "No Package Found By this ID!");
  }

  console.log('Final payload going into DB:', payload);

  const result = await Package.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to Update Package');
  }

  return result;
};


const getPackageFromDB = async (paymentType: string): Promise<IPackage | null> => {
  const query: any = {
    status: "Active"
  }
  if (paymentType) {
    query.paymentType = paymentType
  }

  const result = await Package.findOne(query);
  return result;
}

const getPackageDetailsFromDB = async (id: string): Promise<IPackage | null> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid ID")
  }
  const result = await Package.findById(id);
  return result;
}





export const PackageService = {
  createPackageToDB,
  updatePackageToDB,
  getPackageFromDB,
  getPackageDetailsFromDB,
}