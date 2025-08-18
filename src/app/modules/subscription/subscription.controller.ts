import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { SubscriptionService } from "./subscription.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import { User } from "../user/user.model";
import ApiError from "../../../errors/ApiError";
import { Package } from "../package/package.model";
import { Subscription } from "./subscription.model";
import Stripe from "stripe";
import { Types } from "mongoose";


const subscriptions = catchAsync( async(req: Request, res: Response)=>{
    const result = await SubscriptionService.subscriptionsFromDB(req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Membership List Retrieved Successfully",
        data: result
    })
});



const subscriptionDetails = catchAsync( async(req: Request, res: Response)=>{
    const result = await SubscriptionService.subscriptionDetailsFromDB(req.user);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Membership Details Retrieved Successfully",
        data: result.subscription
    })
});

const companySubscriptionDetails= catchAsync( async(req: Request, res: Response)=>{
    const result = await SubscriptionService.companySubscriptionDetailsFromDB(req.params.id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Company Membership Details Retrieved Successfully",
        data: result.subscription
    })
});

const cancelSubscription = catchAsync(async (req: Request, res: Response) => {
    const result = await SubscriptionService.cancelSubscription(req.user);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: result.message,
        data: null 
    });
});

const autoCreateFreeMembership = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user.id;

    const result = await SubscriptionService.createFreeMembership(userId);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Free membership created successfully",
        data: result,
    });
});

//get specific user subscription service get
const getUserSubscriptionController = catchAsync(async (req: Request, res: Response) => {
    const userId = req.params.id;

    if (!Types.ObjectId.isValid(userId)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid user ID format.");
    }

    const subscription = await SubscriptionService.getUserSubscription(userId);

    if (!subscription) {
        throw new ApiError(StatusCodes.NOT_FOUND, "No subscription found for this user.");
    }

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "User subscription retrieved successfully",
        data: subscription,
    });
});
export const SubscriptionController = {
    subscriptions,
    subscriptionDetails,
    companySubscriptionDetails,
    cancelSubscription,
    autoCreateFreeMembership,
    getUserSubscriptionController
}