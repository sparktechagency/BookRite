import { StatusCodes } from 'http-status-codes';
import Stripe from 'stripe';
import ApiError from '../../errors/ApiError';
import stripe from '../../config/stripe';
import { User } from '../../app/modules/user/user.model';
import { Package } from '../modules/package/package.model';
import { Subscription } from '../modules/subscription/subscription.model';
import { ObjectId, Schema } from 'mongoose';
import { sendNotifications } from '../../helpers/notificationsHelper';
import { IPackage, IUser } from '../modules/user/user.interface';


// Helper function to convert timestamps safely
const safeConvertTimestamp = (timestamp: any, fallbackDays = 0): string => {
  try {
    if (timestamp == null || isNaN(Number(timestamp))) {
      console.warn(`Invalid timestamp received: ${timestamp}. Using fallback.`);
      return new Date(Date.now() + fallbackDays * 24 * 60 * 60 * 1000).toISOString();
    }
    const numTimestamp = typeof timestamp === 'string' ? parseInt(timestamp, 10) : Number(timestamp);
    if (isNaN(numTimestamp) || numTimestamp <= 0) {
      console.warn(`Invalid numeric timestamp: ${numTimestamp}. Using fallback.`);
      return new Date(Date.now() + fallbackDays * 24 * 60 * 60 * 1000).toISOString();
    }
    const date = new Date(numTimestamp * 1000);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date created from timestamp: ${numTimestamp}. Using fallback.`);
      return new Date(Date.now() + fallbackDays * 24 * 60 * 60 * 1000).toISOString();
    }
    return date.toISOString();
  } catch (error) {
    console.error(`Error in timestamp conversion: ${error}`);
    return new Date(Date.now() + fallbackDays * 24 * 60 * 60 * 1000).toISOString();
  }
};

// Helper function to map Stripe status to subscription status
const getSubscriptionStatus = (stripeStatus: string, currentPeriodEnd: string): 'active' | 'expired' | 'cancel' => {
  const isExpired = new Date(currentPeriodEnd) < new Date();
  if (isExpired) {
    return 'expired';
  }
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'canceled':
      return 'cancel';
    case 'past_due':
    case 'unpaid':
    case 'incomplete_expired':
      return 'expired';
    default:
      console.warn(`Unknown Stripe subscription status: ${stripeStatus}. Defaulting to expired.`);
      return 'expired';
  }
};

// Helper function to find and validate user
const getUserByEmail = async (email: string): Promise<IUser> => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'No user found for email');
  }
  return user;
};

// Helper function to find and validate pricing plan
const getPackageByProductId = async (productId: string): Promise<IPackage> => {
  const plan = await Package.findOne({ productId });
  if (!plan) {
    throw new ApiError(StatusCodes.NOT_FOUND, `Pricing plan with Product ID: ${productId} not found`);
  }
  return plan.toObject();
   
};

// Helper function to create or update subscription
const createNewSubscription = async (
  user: Schema.Types.ObjectId,
  customerId: string,
  packageId: Schema.Types.ObjectId,
  amountPaid: number,
  trxId: string,
  subscriptionId: string,
  currentPeriodStart: string,
  currentPeriodEnd: string,
  remaining: number,
  stripeStatus: string
) => {
  const isExistSubscription = await Subscription.findOne({ user });
  const status = getSubscriptionStatus(stripeStatus, currentPeriodEnd);

  const payload = {
    customerId,
    price: amountPaid,
    user,
    package: packageId,
    trxId,
    subscriptionId,
    status,
    currentPeriodStart,
    currentPeriodEnd,
    remaining,
  };

  if (isExistSubscription) {
    await Subscription.findByIdAndUpdate(isExistSubscription._id, payload, { new: true });
  } else {
    const newSubscription = new Subscription(payload);
    await newSubscription.save();
  }
};


export const handleSubscriptionCreated = async (data: Stripe.Subscription) => {
  try {
    // Use the provided subscription data directly
    const stripeSubscription = data;
    console.log('Raw current_period_start:', stripeSubscription.current_period_start);
    console.log('Raw current_period_end:', stripeSubscription.current_period_end);

    const customer = await stripe.customers.retrieve(stripeSubscription.customer as string) as Stripe.Customer;
    const productId = stripeSubscription.items.data[0]?.price?.product as string;
    if (!productId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Product ID not found in subscription');
    }

    const invoice = await stripe.invoices.retrieve(stripeSubscription.latest_invoice as string);
    const trxId = (invoice as any)?.payment_intent as string || stripeSubscription.id;
    const amountPaid = (invoice?.total || 0) / 100;

    // Find user and pricing plan
    const user = await getUserByEmail(customer.email as string);
    const packageData = await getPackageByProductId(productId);

    // Convert timestamps
    const currentPeriodStart = safeConvertTimestamp(stripeSubscription.current_period_start, 0);
    const currentPeriodEnd = safeConvertTimestamp(stripeSubscription.current_period_end, 30);

    // Create or update subscription
    await createNewSubscription(
      user._id,
      customer.id,
      packageData._id,
      amountPaid,
      trxId,
      stripeSubscription.id,
      currentPeriodStart,
      currentPeriodEnd,
      packageData.credit,
      stripeSubscription.status
    );

    // Update user subscription status
    await User.findByIdAndUpdate(
      user._id,
      { isSubscribed: stripeSubscription.status === 'active' || stripeSubscription.status === 'trialing' },
      { new: true }
    );

    // Send notification
    const notifications = {
      text: user?.company ? `${user.company} has arrived` : `New subscription created for user ${user.email}`,
      link: `/subscription-earning?id=${user._id}`,
      screen: 'subscription_earning',
    };
    await sendNotifications(notifications);

    console.log(`Subscription created successfully for user: ${user.email}`);
  } catch (error) {
    console.error('Error handling subscription creation:', error);
    throw error; // Rethrow to be caught by webhook handler
  }
};
