import { StatusCodes } from 'http-status-codes';
import Stripe from 'stripe';
import ApiError from '../../errors/ApiError';
import stripe from '../../config/stripe';
import { Subscription } from '../modules/inApp/subscription.model';
import { User } from '../modules/user/user.model';

export const handleSubscriptionDeleted = async (data: Stripe.Subscription) => {

    const subscription = await stripe.subscriptions.retrieve(data.id);

    const userSubscription: any = await Subscription.findOne({
        customerId: subscription.customer,
        status: 'active',
    });

    if (userSubscription) {

        await Subscription.findByIdAndUpdate(
            userSubscription._id,
            { status: 'deactivated' },
            { new: true }
        );

        // Find the user associated with the subscription
        const existingUser = await User.findById(userSubscription?.userId);

        if (existingUser) {
            await User.findByIdAndUpdate(
                existingUser._id,
                { hasAccess: false },
                { new: true },
            );
        } else {
            throw new ApiError(StatusCodes.NOT_FOUND, `User not found.`);
        }
    } else {
        throw new ApiError(StatusCodes.NOT_FOUND, `Subscription not found.`);
    }
}