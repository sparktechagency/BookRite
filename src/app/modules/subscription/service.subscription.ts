import Stripe from 'stripe';
import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enums/user';
import config from '../../../config';

const stripe = new Stripe(config.stripe.stripe_api_secret as string, {
    apiVersion: "2025-04-30.basil", 
});

export class StripeService {
  // Create a Stripe Subscription Plan
  async createSubscriptionPlan(name: string, amount: number, currency: string) {
    try {
      const product = await stripe.products.create({
        name,
        description: 'Subscription Plan',
      });

      const price = await stripe.prices.create({
        unit_amount: amount * 100, // Convert to the smallest currency unit (e.g., cents)
        currency,
        product: product.id,
        recurring: { interval: 'year' },
      });

      return price.id;
    } catch (error) {
      throw new Error(`Failed to create subscription plan: ${error}`);
    }
  }

  async createStripeCustomer(userId: string, email: string) {
    try {
      console.log('Attempting to create Stripe customer for userId:', userId);
      
      // First, check if user exists and already has a Stripe customer ID
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // If user already has a Stripe customer ID, return it
      if (user.stripeCustomerId) {
        console.log('User already has Stripe customer ID:', user.stripeCustomerId);
        return user.stripeCustomerId;
      }
      
      // Check if a Stripe customer already exists for the given email
      const existingCustomer = await stripe.customers.list({
        email: email,
        limit: 1,
      });
      
      if (existingCustomer.data.length > 0) {
        // If the customer exists, use the existing customer ID
        const customerId = existingCustomer.data[0].id;
        console.log('Stripe customer already exists:', customerId);
        
        // Update user with the Stripe customer ID (no need to modify email)
        user.stripeCustomerId = customerId;
        await user.save();
        
        return customerId;
      }
      
      // If no existing customer is found, create a new Stripe customer
      const customer = await stripe.customers.create({
        email,
      });
      
      // Update user with the new Stripe customer ID
      user.stripeCustomerId = customer.id;
      await user.save();
      
      console.log('Stripe customer created successfully:', customer.id);
      return customer.id;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
  
      // Log the error to debug the issue more thoroughly
      console.error('Full error:', error);
  
      // If the error message is specifically from Stripe regarding email duplication, handle it gracefully
      if (error instanceof Error && error.message.includes('Email already exists')) {
        // Ignore this error since it means the email is already used in Stripe
        console.log('Stripe customer already exists with the provided email. Returning existing customer ID.');
        const user = await User.findById(userId);
        return user?.stripeCustomerId;  // Return the existing stripeCustomerId if available
      }
  
      // Rethrow any other errors
      throw new Error(`Failed to create Stripe customer: ${ error}`);
    }
  }
  
  

  // Create Checkout Session for Subscription
  async createCheckoutSession(priceId: string, customerId: string) {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.BASE_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.BASE_URL}/subscription/cancel`,
        customer: customerId,
      });

      return session.url;
    } catch (error) {
      throw new Error(`Failed to create checkout session: ${error}`);
    }
  }

  // Update User Subscription Status after Payment
  async updateUserSubscriptionStatus(userId: string, stripeSubscriptionId: string) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');
      
      user.subscription = { status: true, stripeSubscriptionId, externalSubscriptionId: '' };
      await user.save();
    } catch (error) {
      throw new Error(`Failed to update subscription status: ${error}`);
    }
  }
}

