import { Request, Response } from 'express';
import config from '../../../config';
import Stripe from 'stripe';
import stripe from '../../../config/stripe';
import ApiError from '../../../errors/ApiError';
import colors from 'colors';
import { handleSubscriptionCreated } from '../../handlers/handleSubscriptionCreated';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../../../shared/logger';
import { PaymentService } from '../payment/payment.service';

// const handleStripeWebhook = async (req: Request, res: Response) => {

//     let event: Stripe.Event | undefined;

//     // Verify the event signature
//     try {
        
//         // Use raw request body for verification
//         event = stripe.webhooks.constructEvent(
//             req.body, 
//             req.headers['stripe-signature'] as string, 
//             config.stripe.webhookSecret as string
//         );
//     } catch (error) {
        
//         // Return an error if verification fails
//         throw new ApiError(
//             StatusCodes.BAD_REQUEST,
//             `Webhook signature verification failed. ${error}`,
//         );
//     }

//     // Check if the event is valid
//     if (!event) {
//         throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid event received!');
//     }

//     // Extract event data and type
//     const data = event.data.object as Stripe.Subscription | Stripe.Account;
//     const eventType = event.type;

//     // Handle the event based on its type
//     try {
//         switch (eventType) {
//             case 'customer.subscription.created':
//                 await handleSubscriptionCreated(data as Stripe.Subscription);
//                 break;

//             default:
//                 logger.warn(colors.bgGreen.bold(`Unhandled event type: ${eventType}`));
//         }
//     } catch (error) {
//         // Handle errors during event processing
//         throw new ApiError(
//             StatusCodes.INTERNAL_SERVER_ERROR,
//             `Error handling event: ${error}`,
//         );
//     }

//     res.sendStatus(200); // Send success response
// };

// export const unifiedStripeWebhookHandler = async (req: Request, res: Response): Promise<void> => {
//   let event: Stripe.Event;

//   try {
//     event = stripe.webhooks.constructEvent(
//       req.body,
//       req.headers['stripe-signature'] as string,
//       config.stripe.webhookSecret as string
//     );
//   } catch (err) {
//     console.error(`Webhook signature verification failed: ${err}`);
//     res.status(400).send(`Webhook Error: ${err}`);
//     return;
//   }

//   try {
//     switch (event.type) {
//       case 'checkout.session.completed': {
//         const session = event.data.object as Stripe.Checkout.Session;
//         await PaymentService.handlePaymentSuccess(session);
//         break;
//       }

//       case 'customer.subscription.created': {
//         const subscription = event.data.object as Stripe.Subscription;
//         await handleSubscriptionCreated(subscription);
//         break;
//       }

//       case 'charge.refunded': {
//         const charge = event.data.object as Stripe.Charge;
//         await PaymentService.handleRefundSuccess(charge);
//         break;
//       }

//       default:
//         logger.warn(colors.bgGreen.bold(`Unhandled event type: ${event.type}`));
//     }

//     res.status(200).json({ received: true });
//   } catch (err) {
//     console.error(`Error processing webhook event: ${err}`);
//     res.status(500).json({ error: 'Webhook processing failed' });
//   }
// };
export const unifiedStripeWebhookHandler = async (req: Request, res: Response): Promise<void> => {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'] as string,
      config.stripe.webhookSecret as string
    );
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err}`);
    res.status(400).send(`Webhook Error: ${err}`);
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await PaymentService.handlePaymentSuccess(session);
        break;
      }
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(subscription);
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await PaymentService.handleRefundSuccess(charge);
        break;
      }
      case 'payment_method.attached':
      case 'customer.created':
      case 'customer.updated':
      case 'payment_intent.succeeded':
      case 'payment_intent.created':
      case 'charge.succeeded':
      case 'invoice.created':
      case 'invoice.finalized':
      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        console.log(`Received event: ${event.type} - No action required`);
        break;
      }
      default:
        console.warn(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error(`Error processing webhook event: ${err}`);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};


export default unifiedStripeWebhookHandler;