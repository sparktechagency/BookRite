import { JwtPayload } from "jsonwebtoken";
import { Package } from "../package/package.model";
import { ISubscription } from "./subscription.interface";
import { Subscription } from "./subscription.model";
import stripe from "../../../config/stripe";
import { User } from "../user/user.model";
import ApiError from "../../../errors/ApiError";
import { StatusCodes } from "http-status-codes";
import { logger } from "../../../shared/logger";


const subscriptionDetailsFromDB = async (user: JwtPayload): Promise<{ subscription: ISubscription | {} }> => {

    const subscription = await Subscription.findOne({ user: user.id }).populate("package", "title credit").lean();
    if (!subscription) {
        return { subscription: {} }; // Return empty object if no subscription found
    }

    const subscriptionFromStripe = await stripe.subscriptions.retrieve(subscription.subscriptionId);

    // Check subscription status and update database accordingly
    if (subscriptionFromStripe?.status !== "active") {
        await Promise.all([
            User.findByIdAndUpdate(user.id, { isSubscribed: false }, { new: true }),
            Subscription.findOneAndUpdate({ user: user.id }, { status: "expired" }, { new: true }),
        ]);
    }

    return { subscription };
};

const companySubscriptionDetailsFromDB = async (id: string): Promise<{ subscription: ISubscription | {} }> => {

    const subscription = await Subscription.findOne({ user: id }).populate("package", "title credit").lean();
    if (!subscription) {
        return { subscription: {} }; // Return empty object if no subscription found
    }

    const subscriptionFromStripe = await stripe.subscriptions.retrieve(subscription.subscriptionId);

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

const purchaseSubscription = async (userId: string, packageId: string): Promise<any> => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            logger.error(`User with ID ${userId} not found`);
            throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
        }

        logger.info(`User data: ${JSON.stringify(user)}`);

        if (user.role !== 'ADMIN') {
            logger.error(`User with ID ${userId} is not an ADMIN. Role: ${user.role}`);
            throw new ApiError(StatusCodes.FORBIDDEN, "Only ADMIN can purchase subscription");
        }

        const packageToPurchase = await Package.findById(packageId);
        if (!packageToPurchase) {
            logger.error(`Package with ID ${packageId} not found`);
            throw new ApiError(StatusCodes.NOT_FOUND, "Package not found");
        }

        if (packageToPurchase.paymentType !== 'Yearly') {
            logger.error(`Package with ID ${packageId} is not a yearly subscription`);
            throw new ApiError(StatusCodes.BAD_REQUEST, "Only yearly subscriptions can be purchased by ADMIN");
        }

        // Ensure priceId exists and is valid
        const priceId = packageToPurchase.priceId;  // Assuming `priceId` is the correct field for Stripe's Price ID
        if (!priceId) {
            logger.error(`Package with ID ${packageId} does not have a valid price ID`);
            throw new ApiError(StatusCodes.BAD_REQUEST, "Package does not have a valid price ID");
        }

        // Convert the priceId to a string (if necessary) before passing it to Stripe
        const priceIdString = priceId.toString();  // Convert to primitive string if it's a String object

        // Check if user has a Stripe customer ID
        let customerId = user.stripeCustomerId;
        if (!customerId) {
            logger.info(`User with ID ${userId} does not have a Stripe customer ID. Checking Stripe...`);

            const existingCustomer = await stripe.customers.list({
                email: user.email,
                limit: 1,
            });

            if (existingCustomer.data.length > 0) {
                customerId = existingCustomer.data[0].id;
                logger.info(`Found existing Stripe customer for user ID ${userId}. Customer ID: ${customerId}`);
            } else {
                logger.info(`Creating new Stripe customer for user ID ${userId}...`);
                const stripeCustomer = await stripe.customers.create({
                    email: user.email,
                    name: user.name,
                });

                customerId = stripeCustomer.id;
                user.stripeCustomerId = customerId;
                await user.save();

                logger.info(`Stripe customer created for user ID ${userId}. Customer ID: ${customerId}`);
            }
        }

        // Create Stripe subscription using the correct price ID
        const stripeSubscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: priceIdString }],  // This ensures that the price is passed as a string
            expand: ['latest_invoice.payment_intent'],
        });

        // Update user's subscription status
        user.subscription = {
            status: true,
            stripeSubscriptionId: stripeSubscription.id,
            externalSubscriptionId: stripeSubscription.id, // Assuming the same ID is used
        };
        await user.save();

        logger.info(`Subscription created successfully for user ID ${userId}`);

        return stripeSubscription;
    } catch (error) {
        logger.error("Error in subscription service:", error);
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to create subscription. Error details: " + error);
    }
};



export const SubscriptionService = {
    subscriptionDetailsFromDB,
    subscriptionsFromDB,
    companySubscriptionDetailsFromDB,
    purchaseSubscription
}