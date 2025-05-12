import { Request, Response, NextFunction } from 'express';
import { StripeService } from './service.subscription';
import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enums/user';
import ApiError from '../../../errors/ApiError';

const stripeService = new StripeService();

export class SubscriptionController {
  // Create Subscription Plan (Super Admin)
  async createSubscriptionPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, amount, currency } = req.body;
      const user = req.user;

      if (user.role !== USER_ROLES.SUPER_ADMIN) {
        throw new ApiError(403, 'Only SUPER_ADMIN can create subscription plans');
      }

      const priceId = await stripeService.createSubscriptionPlan(name, amount, currency);

      res.status(201).json({
        message: 'Subscription plan created successfully',
        priceId,
      });
    } catch (error) {
      next(error);
    }
  }

// Ensure the user is authenticated and has a valid Stripe customer ID
// Admin Creates Checkout Session for Subscription Purchase
async createCheckoutSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { priceId } = req.body;
      const user = req.user;
  
      // Confirm the user is authenticated and has correct user data
      console.log('Authenticated User in Controller:', user);
  
      if (user.role !== USER_ROLES.ADMIN) {
        throw new ApiError(403, 'Only ADMIN can initiate checkout');
      }
  
      // Ensure the user has a Stripe customer ID, otherwise create one
      if (!user.stripeCustomerId) {
        await stripeService.createStripeCustomer(user._id, user.email);  // Notice user._id is passed
      }
  
      if (!user.stripeCustomerId) {
        throw new ApiError(400, 'User does not have a Stripe customer ID');
      }
  
      const checkoutUrl = await stripeService.createCheckoutSession(priceId, user.stripeCustomerId);
      res.status(200).json({ checkoutUrl });
    } catch (error) {
      next(error);
    }
  }
  
  
  

  // Stripe webhook to handle subscription success
  async handleStripeWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const event = req.body;

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.customer; // Assuming you store userId in the customer field

        await stripeService.updateUserSubscriptionStatus(userId, session.subscription);
      }

      res.status(200).send('Webhook handled');
    } catch (error) {
      next(error);
    }
  }
}
