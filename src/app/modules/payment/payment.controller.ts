// import { Request, Response } from 'express';
// import { StatusCodes } from 'http-status-codes';
// import { createPaymentSession, } from './payment.service'; // Path to the service
// import ApiError from '../../../errors/ApiError'; // Assuming ApiError handles custom errors
// import Stripe from 'stripe';
// import { Booking } from '../booking/booking.model';
// import config from '../../../config';
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || " ", {
//     apiVersion: "2025-04-30.basil",
// });

// export const initiatePayment = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { bookingId } = req.params;
//     const paymentUrl = await createPaymentSession(bookingId);
//     res.status(200).json({
//       success: true,
//       message: 'Stripe session created successfully',
//       paymentUrl,
//     });
//   } catch (error: any) {
//     console.error('Payment session creation failed:', error.message || error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to create payment session',
//       error: error instanceof Error ? error.message : error,
//     });
//   }
// };

// export const stripeWebhookHandler = async (req: Request, res: Response): Promise<void> =>{
//         const sig = req.headers['stripe-signature'] as string;
//         const endpointSecret = config.stripe.webhookSecret;
      
//         let event: Stripe.Event;
      
//         try {
//           event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret!);
//         } catch (err) {
//           console.error('Webhook signature verification failed:', err);
//            res.status(400).send(`Webhook Error: ${(err as any).message}`);
//             return;
//         }
      
//         // ✅ Handle checkout session completed event
//         // if (event.type === 'checkout.session.completed') {
//         //   const session = event.data.object as Stripe.Checkout.Session;
      
//         //   try {
//         //     const booking = await Booking.findOne({ paymentSessionId: session.id });
//         //     if (booking) {
//         //       booking.paymentStatus = 'Paid';
//         //       booking.status = 'Accepted'; // optionally update booking status
//         //       await booking.save();
//         //       console.log(`✅ Booking ${booking._id} marked as Paid.`);
//         //     } else {
//         //       console.warn(`⚠️ Booking with session ID ${session.id} not found.`);
//         //     }
//         //   } catch (error) {
//         //     console.error('❌ Error updating booking status:', error);
//         //   }
//         // }

        
//         if (event.type === 'checkout.session.completed') {
//             const session = event.data.object as Stripe.Checkout.Session;
          
//             console.log('✅ Webhook received for session:', session.id);
          
//             try {
//               const booking = await Booking.findOne({ paymentSessionId: session.id });
//               if (booking) {
//                 booking.paymentStatus = 'Paid';
//                 booking.status = 'Completed';
//                 await booking.save();
//                 console.log(`✅ Booking ${booking._id} marked as Paid.`);
//               } else {
//                 console.warn(`⚠️ Booking not found for session ID: ${session.id}`);
//               }
//             } catch (error) {
//               console.error('❌ Error updating booking status:', error);
//             }
//           }
          
      
//         res.status(200).json({ received: true });
//       };

import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import Stripe from 'stripe';
import config from '../../../config';
import { PaymentService } from './payment.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import ApiError from '../../../errors/ApiError';

const stripe = new Stripe(config.stripe.stripe_api_secret as string, {
  apiVersion: "2025-04-30.basil",
});

// Create a payment session for a booking
const createPaymentSession = catchAsync(async (req: Request, res: Response) => {
  const { bookingId } = req.body;
  
  if (!bookingId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Booking ID is required');
  }

  const result = await PaymentService.createPaymentSession(bookingId, req.user);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Payment session created successfully',
    data: result,
  });
});

// Retrieve payment status for a booking
const getPaymentStatus = catchAsync(async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  
  const result = await PaymentService.getPaymentStatus(bookingId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Payment status retrieved successfully',
    data: result,
  });
});

// Handle refund for a booking
const createRefund = catchAsync(async (req: Request, res: Response) => {
  const { bookingId } = req.body;
  
  const result = await PaymentService.createRefund(bookingId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Refund processed successfully',
    data: result,
  });
});

// Webhook to handle Stripe events
export const handleStripeWebhooks = async (req: Request, res: Response): Promise<void> => {
  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'] as string,
      config.stripe.webhookSecret as string
    );
  } catch (error) {
    console.error(`Webhook signature verification failed: ${error}`);
     res.status(400).send(`Webhook Error: ${error}`);
    return;
  }

  try {
    // Handle the event based on type
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        await PaymentService.handlePaymentSuccess(session);
        break;
      case 'charge.refunded':
        const charge = event.data.object as Stripe.Charge;
        await PaymentService.handleRefundSuccess(charge);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook: ${error}`);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

export const PaymentController = {
  createPaymentSession,
  getPaymentStatus,
  createRefund,
  handleStripeWebhooks,
};