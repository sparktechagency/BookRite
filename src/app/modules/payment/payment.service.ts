import Stripe from 'stripe';
import { Booking } from '../booking/booking.model'; // Assuming the Booking model is in this path
import ApiError from '../../../errors/ApiError'; // Custom error handling
import { StatusCodes } from 'http-status-codes';
import config from '../../../config';
import { Servicewc } from '../service/serviceswc.model';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || " ", {
    apiVersion: "2025-04-30.basil", 
    
  });export const createPaymentSession = async (bookingId: string) => {
    const booking = await Booking.findById(bookingId).populate('serviceId');
    if (!booking) {
      throw new Error('Booking not found');
    }

  
    const service = booking.serviceId as any; // populated, so it has full object
  
    if (typeof service.price !== 'number' || isNaN(service.price)) {
        throw new Error('Service price is invalid or missing');
      }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: service.serviceName,
              description: service.serviceDescription,
            },
            unit_amount: Math.round(service.price * 100), // amount in cents
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/booking-success?bookingId=${booking._id}`,
      cancel_url: `${process.env.CLIENT_URL}/booking-cancel?bookingId=${booking._id}`,
      metadata: {
        bookingId: booking._id.toString(),
      },
    });
  
    // Update booking with session ID
    booking.paymentSessionId = session.id;
    await booking.save();
  
    return session.url;
  };