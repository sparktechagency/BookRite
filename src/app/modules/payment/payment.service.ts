// import Stripe from 'stripe';
// import { Booking } from '../booking/booking.model'; // Assuming the Booking model is in this path
// import ApiError from '../../../errors/ApiError'; // Custom error handling
// import { StatusCodes } from 'http-status-codes';
// import config from '../../../config';
// import { Servicewc } from '../service/serviceswc.model';

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || " ", {
//     apiVersion: "2025-04-30.basil", 
    
//   });
// export const createPaymentSession = async (bookingId: string) => {
//   const booking = await Booking.findById(bookingId).populate('serviceId');
//   if (!booking) {
//     throw new Error('Booking not found');
//   }

//   const service = booking.serviceId as any;
//   const priceNumber = Number(service.price);
//   if (isNaN(priceNumber) || priceNumber <= 0) {
//     throw new Error('Service price is invalid or missing');
//   }

//   const session = await stripe.checkout.sessions.create({
//     payment_method_types: ['card'],
//     mode: 'payment',
//     line_items: [
//       {
//         price_data: {
//           currency: 'usd',
//           product_data: {
//             name: service.serviceName,
//             description: service.serviceDescription,
//           },
//           unit_amount: Math.round(priceNumber * 100),
//         },
//         quantity: 1,
//       },
//     ],
//     success_url: `${process.env.CLIENT_URL}/booking-success?bookingId=${booking._id}`,
//     cancel_url: `${process.env.CLIENT_URL}/booking-cancel?bookingId=${booking._id}`,
//     metadata: {
//       bookingId: booking._id.toString(),
//     },
//   });

//   booking.paymentSessionId = session.id;
//   await booking.save();

//   return session.url;
// };


import { StatusCodes } from 'http-status-codes';
import Stripe from 'stripe';
import mongoose from 'mongoose';
import config from '../../../config';
import ApiError from '../../../errors/ApiError';
import { Booking } from '../booking/booking.model';
import { User } from '../user/user.model';
import { Servicewc } from '../service/serviceswc.model'; 

const stripe = new Stripe(config.stripe.stripe_api_secret as string, {
 apiVersion: "2025-04-30.basil",
});


const createPaymentSession = async (bookingId: string, user: any) => {
  // Find the booking
  const booking = await Booking.findById(bookingId)
    .populate('serviceId')
    .populate('serviceProviderId');

  if (!booking) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Booking not found');
  }

  // Check if booking belongs to current user
  if (booking.userId.toString() !== user._id.toString()) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Not authorized to pay for this booking');
  }

  // Check if booking is already paid
  if (booking.paymentStatus === 'Paid') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Booking is already paid');
  }

const service = booking.serviceId as any;
const priceNumber = Number(service.price);

if (isNaN(priceNumber) || priceNumber <= 0) {
  throw new ApiError(StatusCodes.BAD_REQUEST, 'Service price is invalid or missing');
}
unit_amount: Math.round(priceNumber * 100)

  // Create or get Stripe customer
  let customerId = '';
  const currentUser = await User.findById(user._id);

  if (!currentUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  if (currentUser.stripeCustomerId) {
    customerId = currentUser.stripeCustomerId;
  } else {
    // Create a new customer in Stripe
    const customer = await stripe.customers.create({
      email: currentUser.email,
      name: currentUser.name || undefined,
      metadata: {
        userId: currentUser._id.toString()
      }
    });
    
    customerId = customer.id;
    
    // Update user with Stripe customer ID
    currentUser.stripeCustomerId = customerId;
    await currentUser.save();
  }

  // Format date for display
  const bookingDate = new Date(booking.bookingDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Create a checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    customer: customerId,
   line_items: [
    {
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${service.serviceName || 'Service'} Booking`,
          description: `Booking for ${service.serviceName || 'service'} on ${bookingDate} at ${booking.location}`,
          images: service.images && service.images.length > 0 ? [service.images[0]] : undefined,
        },
        unit_amount: Math.round(priceNumber * 100), // amount in cents as integer
      },
      quantity: 1,
    },
  ],
    metadata: {
      bookingId: booking._id.toString(),
      userId: user._id.toString(),
      serviceProviderId: booking.serviceProviderId ? booking.serviceProviderId.toString() : ''
    },
    mode: 'payment',
    success_url: `${config.stripe.clientUrl}/bookings/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.stripe.clientUrl}/bookings/${booking._id}`,
  });

  // Update booking with session ID
  booking.paymentSessionId = session.id;
  await booking.save();

  return {
    sessionId: session.id,
    url: session.url
  };
};

/**
 * Get payment status for a booking
 * @param bookingId The ID of the booking to check payment status
 */
const getPaymentStatus = async (bookingId: string) => {
  const booking = await Booking.findById(bookingId);
  
  if (!booking) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Booking not found');
  }

  if (!booking.paymentSessionId) {
    return {
      paymentStatus: booking.paymentStatus,
      message: 'No payment has been initiated for this booking'
    };
  }

  // If payment is already marked as paid, return the status
  if (booking.paymentStatus === 'Paid') {
    return {
      paymentStatus: booking.paymentStatus,
      message: 'Payment completed successfully'
    };
  }

  // Check payment status from Stripe
  try {
    const session = await stripe.checkout.sessions.retrieve(booking.paymentSessionId);
    
    if (session.payment_status === 'paid' && booking.paymentStatus !== 'Paid' as any) {
      // Update booking payment status
      booking.paymentStatus = 'Paid';
      await booking.save();
    }

    return {
      paymentStatus: booking.paymentStatus,
      stripeStatus: session.payment_status,
      sessionId: session.id,
      message: session.payment_status === 'paid' ? 'Payment completed successfully' : 'Payment is pending'
    };
  } catch (error) {
    console.error('Error retrieving payment session:', error);
    return {
      paymentStatus: booking.paymentStatus,
      message: 'Error retrieving payment information'
    };
  }
};

/**
 * Handle successful payment webhook from Stripe
 * @param session Stripe Checkout Session object
 */
const handlePaymentSuccess = async (session: Stripe.Checkout.Session) => {
  try {
    const bookingId = session.metadata?.bookingId;
    
    if (!bookingId) {
      console.error('No booking ID found in session metadata');
      return;
    }

    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      console.error(`Booking not found for ID: ${bookingId}`);
      return;
    }

    // Update booking payment status
    booking.paymentStatus = 'Paid';
    
    // Optionally update booking status here if you want to automatically 
    // move it to a different status upon successful payment
    // booking.status = 'Accepted'; 

    await booking.save();
    
    console.log(`Payment completed for booking ${bookingId}`);
    
    // Additional logic here - e.g., send notifications, update service provider's dashboard, etc.
    
  } catch (error) {
    console.error('Error processing payment success:', error);
  }
};

/**
 * Create a refund for a booking
 * @param bookingId The ID of the booking to refund
 */
const createRefund = async (bookingId: string) => {
  const booking = await Booking.findById(bookingId);
  
  if (!booking) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Booking not found');
  }

  if (booking.paymentStatus !== 'Paid') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Booking payment is not paid yet');
  }

  if (!booking.paymentSessionId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No payment session found for this booking');
  }

  try {
    // Get the session to find the payment intent
    const session = await stripe.checkout.sessions.retrieve(booking.paymentSessionId);
    
    if (!session.payment_intent) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'No payment intent found for this session');
    }

    // Get payment intent to find the charge ID
    const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string);
    
    if (!paymentIntent.latest_charge) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'No charge found for this payment');
    }

    // Create refund
    const refund = await stripe.refunds.create({
      charge: paymentIntent.latest_charge as string,
    });

    // Update booking status
    booking.paymentStatus = 'Refunded';
    await booking.save();

    return {
      refundId: refund.id,
      status: refund.status
    };
  } catch (error) {
    console.error('Error processing refund:', error);
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      `Error processing refund: ${error}`
    );
  }
};

/**
 * Handle refund success webhook from Stripe
 * @param charge Stripe Charge object
 */
const handleRefundSuccess = async (charge: Stripe.Charge) => {
  try {
    // Find the related payment intent
    const paymentIntentId = charge.payment_intent;
    
    if (!paymentIntentId) {
      console.error('No payment intent ID found in charge');
      return;
    }

    // Get payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId as string);
    
    // Get session from payment intent metadata or by querying sessions
    const sessions = await stripe.checkout.sessions.list({
      payment_intent: paymentIntentId as string,
      limit: 1
    });

    if (sessions.data.length === 0) {
      console.error('No session found for payment intent');
      return;
    }

    const session = sessions.data[0];
    const bookingId = session.metadata?.bookingId;
    
    if (!bookingId) {
      console.error('No booking ID found in session metadata');
      return;
    }

    // Update booking payment status
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      console.error(`Booking not found for ID: ${bookingId}`);
      return;
    }

    booking.paymentStatus = 'Refunded';
    await booking.save();
    
    console.log(`Refund completed for booking ${bookingId}`);
    
  } catch (error) {
    console.error('Error processing refund success:', error);
  }
};

export const PaymentService = {
  createPaymentSession,
  getPaymentStatus,
  handlePaymentSuccess,
  createRefund,
  handleRefundSuccess
};