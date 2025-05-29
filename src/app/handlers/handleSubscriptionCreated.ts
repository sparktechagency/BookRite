import { StatusCodes } from 'http-status-codes';
import Stripe from 'stripe';
import ApiError from '../../errors/ApiError';
import stripe from '../../config/stripe';
import { User } from '../../app/modules/user/user.model';
import { Package } from '../modules/package/package.model';
import { Subscription } from '../modules/subscription/subscription.model';
import { ObjectId } from 'mongoose';
import { sendNotifications } from '../../helpers/notificationsHelper';

// Helper function to find and validate user
const getUserByEmail = async (email: string) => {
    const user = await User.findOne({ email });
    if (!user) {
        return "No User Found"
    }
    return user;
};

// Helper function to find and validate pricing plan
const getPackageByProductId = async (productId: string) => {
    const plan = await Package.findOne({ productId });
    if (!plan) {
        return  `Pricing plan with Price ID: ${productId} not found!`
    }
    return plan;
};

// Helper function to create new subscription in database
const createNewSubscription = async (
    user: ObjectId,
    customerId: string,
    packageId: ObjectId,
    amountPaid: number,
    trxId: string,
    subscriptionId: string,
    currentPeriodStart: string,
    currentPeriodEnd: string,
    remaining:number

) => {


    const isExistSubscription = await Subscription.findOne({ user: user });

    if (isExistSubscription) {
        const payload = {
            customerId,
            price: amountPaid,
            user,
            package: packageId,
            trxId,
            subscriptionId,
            status: 'active',
            currentPeriodStart,
            currentPeriodEnd,
            remaining
        }
        await Subscription.findByIdAndUpdate(
            { _id: isExistSubscription._id },
            payload,
            {new : true}
        )
    }else{
        const newSubscription = new Subscription({
            customerId,
            price: amountPaid,
            user,
            package: packageId,
            trxId,
            subscriptionId,
            status: 'active',
            currentPeriodStart,
            currentPeriodEnd,
            remaining
        });
        await newSubscription.save();
    }
};

export const handleSubscriptionCreated = async (data: Stripe.Subscription) => {
    try {
        // Retrieve subscription details from Stripe
        const subscriptionResponse = await stripe.subscriptions.retrieve(data.id);
        // If the response is wrapped, use .data, otherwise use as is
        const subscription = (subscriptionResponse as any).data ? (subscriptionResponse as any).data : subscriptionResponse;
        const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
        const productId = subscription.items.data[0]?.price?.product as string;
        const invoice = await stripe.invoices.retrieve(subscription.latest_invoice as string);

        const trxId = (invoice as any)?.payment_intent as string;
        const amountPaid = (invoice?.total || 0) / 100;

        // Find user and pricing plan
        const user: any = await getUserByEmail(customer.email as string);
        const packageID: any = await getPackageByProductId(productId);

        // Get the current period start and end dates (Unix timestamps)
        const currentPeriodStart = new Date(subscription.current_period_start * 1000).toISOString(); 
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

        // Create new subscription and update user status
        await createNewSubscription(
            user._id,
            customer.id,
            packageID._id,
            amountPaid,
            trxId,
            subscription.id,
            currentPeriodStart,
            currentPeriodEnd,
            packageID.credit,
        );

        // await User.findByIdAndUpdate(
        //     { _id: user._id },
        //     { isSubscribed: true },
        //     { new: true }
        // );
        await User.findByIdAndUpdate(user._id, { isSubscribed: true }, { new: true });


        const notifications = {
            text: `${user?.company} has arrived`,
            link: `/subscription-earning?id=${user?._id}`
        }
        sendNotifications(notifications);

    } catch (error) {
        console.error('Error handling subscription creation:', error);
        return error;
    }
};
