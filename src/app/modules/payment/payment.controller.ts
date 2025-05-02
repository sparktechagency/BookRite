import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { createPaymentSession, } from './payment.service'; // Path to the service
import ApiError from '../../../errors/ApiError'; // Assuming ApiError handles custom errors
import Stripe from 'stripe';
import { Booking } from '../booking/booking.model';
import config from '../../../config';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || " ", {
    apiVersion: "2024-06-20",
});

export const initiatePayment = async (req: Request, res: Response): Promise<void> => {
        try {
          const { bookingId } = req.params;
      
          const paymentUrl = await createPaymentSession(bookingId);
      
          res.status(200).json({
            success: true,
            message: 'Stripe session created successfully',
            paymentUrl,
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            message: 'Failed to create payment session',
            error: error instanceof Error ? error.message : error,
          });
        }
      };
    
      export const stripeWebhookHandler = async (req: Request, res: Response): Promise<void> =>{
        const sig = req.headers['stripe-signature'] as string;
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
        let event: Stripe.Event;
      
        try {
          event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret!);
        } catch (err) {
          console.error('Webhook signature verification failed:', err);
           res.status(400).send(`Webhook Error: ${(err as any).message}`);
            return;
        }
      
        // ✅ Handle checkout session completed event
        // if (event.type === 'checkout.session.completed') {
        //   const session = event.data.object as Stripe.Checkout.Session;
      
        //   try {
        //     const booking = await Booking.findOne({ paymentSessionId: session.id });
        //     if (booking) {
        //       booking.paymentStatus = 'Paid';
        //       booking.status = 'Accepted'; // optionally update booking status
        //       await booking.save();
        //       console.log(`✅ Booking ${booking._id} marked as Paid.`);
        //     } else {
        //       console.warn(`⚠️ Booking with session ID ${session.id} not found.`);
        //     }
        //   } catch (error) {
        //     console.error('❌ Error updating booking status:', error);
        //   }
        // }
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
          
            console.log('✅ Webhook received for session:', session.id);
          
            try {
              const booking = await Booking.findOne({ paymentSessionId: session.id });
              if (booking) {
                booking.paymentStatus = 'Paid';
                booking.status = 'Completed';
                await booking.save();
                console.log(`✅ Booking ${booking._id} marked as Paid.`);
              } else {
                console.warn(`⚠️ Booking not found for session ID: ${session.id}`);
              }
            } catch (error) {
              console.error('❌ Error updating booking status:', error);
            }
          }
          
      
        res.status(200).json({ received: true });
      };