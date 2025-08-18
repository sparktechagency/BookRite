import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import { IPackage } from "./package.interface";
import { Package } from "./package.model";
import mongoose from "mongoose";
import { createSubscriptionProduct } from "../../../helpers/createSubscriptionProductHelper";
import stripe from "../../../config/stripe";


const createPackageToDB = async (payload: IPackage): Promise<IPackage | null> => {
  const productPayload = {
    title: payload.title,
     description: Array.isArray(payload.description) ? payload.description.join('\n') : payload.description,
    duration: payload.duration,
    price: Number(payload.price),
  };

  // Create Stripe Product
  const product = await createSubscriptionProduct(productPayload);

  if (!product) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create subscription product");
  }

  payload.paymentLink = product.paymentLink;
  payload.productId = product.productId;

  // Create Stripe Price
  const stripePrice = await stripe.prices.create({
    product: product.productId,
    unit_amount: Math.round(Number(payload.price) * 100), // convert price to number
    currency: 'usd',
    recurring: {
      interval: payload.duration === '1 year' ? 'year' : 'month',
    }
  });

  if (!stripePrice || !stripePrice.id) {
    // Rollback product only — no price deletion possible
    await stripe.products.del(product.productId);
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create price for subscription product");
  }

  payload.priceId = stripePrice.id;

  const result = await Package.create(payload);

  if (!result) {
    await stripe.products.del(product.productId);
    // Can't delete price, so just leave it disabled with product deletion
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create Package");
  }

  return result;
};

const updatePackageToDB = async (
  id: string,
  payload: Partial<IPackage>
): Promise<IPackage | null> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid ID');
  }

  // 🛠 Fix string input for description
  if (payload.description && Array.isArray(payload.description)) {
    payload.description = payload.description.join('\n');
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


const getPackageFromDB = async(paymentType: string): Promise<IPackage[]>=>{
    const query:any = {
        status: "Active"
    }
    if(paymentType){
        query.paymentType = paymentType
    }

    const result = await Package.find(query);
    return result;
}

const getPackageDetailsFromDB = async(id: string): Promise<IPackage | null>=>{
    if(!mongoose.Types.ObjectId.isValid(id)){
        throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid ID")
    }
    const result = await Package.findById(id);
    return result;
}

const deletePackageToDB = async(id: string): Promise<IPackage | null>=>{
    if(!mongoose.Types.ObjectId.isValid(id)){
        throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid ID")
    }

    const result = await Package.findByIdAndUpdate(
        {_id: id},
        {status: "Delete"},
        {new: true}
    );

    if(!result){
        throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to deleted Package")
    }

    return result;
}



export const PackageService = {
    createPackageToDB,
    updatePackageToDB,
    getPackageFromDB,
    getPackageDetailsFromDB,
    deletePackageToDB
}