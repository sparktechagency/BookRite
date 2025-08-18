import { JwtPayload } from "jsonwebtoken";
import { Package } from "../package/package.model";
import { ISubscription } from "./subscription.interface";
import { Subscription } from "./subscription.model";
import stripe from "../../../config/stripe";
import { User } from "../user/user.model";
import ApiError from "../../../errors/ApiError";
import { StatusCodes } from "http-status-codes";
import { USER_ROLES } from "../../../enums/user";
import { Types } from "mongoose";


const subscriptionDetailsFromDB = async (user: JwtPayload): Promise<{ subscription: ISubscription | {} }> => {

    const subscription = await Subscription.findOne({ user: user.id }).populate("package", "title credit").lean();
    if (!subscription) {
        return { subscription: {} }; // Return empty object if no subscription found
    }

    const subscriptionFromStripe = await stripe.subscriptions.retrieve(subscription.membershipId);

    // Check subscription status and update database accordingly
    if (subscriptionFromStripe?.status !== "active") {
        await Promise.all([
            User.findByIdAndUpdate(user.id, { isSubscribed: false }, { new: true }),
            Subscription.findOneAndUpdate({ user: user.id }, { status: "expired" }, { new: true }),
        ]);
    }

    return { subscription };
};

const createFreeMembership = async (userId: string) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error("User not found.");
    }
    if (user.role !== USER_ROLES.ADMIN) {
        throw new Error("Only ADMIN users can create a free membership.");
    }
    const freePackage = await Package.findOne({ isFree: true });
    if (!freePackage) {
        throw new Error("No free package available.");
    }

    const existingMembership = await Subscription.findOne({ user: userId });
    if (existingMembership) {
        throw new Error("User already has a membership.");
    }
    const membership = new Subscription({
        user: userId,
        package: freePackage._id,
        price: 0,
        trxId: "FREE_TRX_" + new Date().getTime(),
        membershipId: "FREE_" + new Date().getTime(),
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(), // 1 month
        remaining: freePackage.credit,
        status: "active",
    });

    await membership.save();

    await User.findByIdAndUpdate(userId, { isSubscribed: true });

    return membership;
};

const companySubscriptionDetailsFromDB = async (id: string): Promise<{ subscription: ISubscription | {} }> => {

    const subscription = await Subscription.findOne({ user: id }).populate("package", "title credit").lean();
    if (!subscription) {
        return { subscription: {} }; // Return empty object if no subscription found
    }

    const subscriptionFromStripe = await stripe.subscriptions.retrieve(subscription.membershipId);

    // Check subscription status and update database accordingly
    if (subscriptionFromStripe?.status !== "active") {
        await Promise.all([
            User.findByIdAndUpdate(id, { isSubscribed: false }, { new: true }),
            Subscription.findOneAndUpdate({ user: id }, { status: "expired" }, { new: true }),
        ]);
    }

    return { subscription };
};

const subscriptionsFromDB = async (query: Record<string, unknown>): Promise<ISubscription[]> => {
    const anyConditions: any[] = [];

    const { search, limit, page, paymentType } = query;

    if (search) {
        const matchingPackageIds = await Package.find({
            $or: [
                { title: { $regex: search, $options: "i" } },
                { paymentType: { $regex: search, $options: "i" } },
            ]
        }).distinct("_id");
    
        if (matchingPackageIds.length) {
            anyConditions.push({
                package: { $in: matchingPackageIds }
            });
        }
    }
    
    

    if (paymentType) {
        anyConditions.push({
            package: { $in: await Package.find({paymentType: paymentType}).distinct("_id")  }
        })
    }

    const whereConditions = anyConditions.length > 0 ? { $and: anyConditions } : {};
    const pages = parseInt(page as string) || 1;
    const size = parseInt(limit as string) || 10;
    const skip = (pages - 1) * size;

    const result = await Subscription.find(whereConditions).populate([
        {
            path: "package",
            select: "title paymentType credit description"
        },
        {
            path: "user",
            select: "email name linkedIn contact company website "
        },
    ])
        .select("user package price trxId currentPeriodStart currentPeriodEnd status")
        .skip(skip)
        .limit(size);

    const count = await Subscription.countDocuments(whereConditions);
    
    const data: any = {
        data: result,
        meta: {
            page: pages,
            total: count
        }
    }

    return data;
}

const cancelSubscription = async (user: JwtPayload): Promise<{ message: string }> => {
    const subscription = await Subscription.findOne({ user: user.id, status: "active" }).lean();
    if (!subscription) {
        throw new ApiError(StatusCodes.NOT_FOUND, "No active subscription found.");
    }

    try {
        await stripe.subscriptions.cancel(subscription.membershipId);
        
        await Subscription.findOneAndUpdate({ user: user.id, status: "active" }, { status: "cancel" });

        await User.findByIdAndUpdate(user.id, { isSubscribed: false });

        return { message: "Subscription successfully cancelled." };
    } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to cancel subscription on Stripe.");
    }
};

//specific user subscription service get
const getUserSubscription = async (userId: string): Promise<ISubscription | null> => {
    if (!Types.ObjectId.isValid(userId)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid user ID format.");
    }

    const userObjectId = new Types.ObjectId(userId);
    const subscription = await Subscription.findOne({ user: userObjectId })
        .populate("package", "title credit")
        .lean();

    return subscription;
};


export const SubscriptionService = {
    subscriptionDetailsFromDB,
    createFreeMembership,
    subscriptionsFromDB,
    companySubscriptionDetailsFromDB,
    cancelSubscription,
    getUserSubscription
}