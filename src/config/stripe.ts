// import Stripe from 'stripe';
// import config from '.';

// const stripe = new Stripe(process.env.STRIPE_WEBHOOK_SECRET|| " ", {
//     apiVersion: "2025-04-30.basil", 
// });

// export default stripe;
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_API_KEY;

if (!stripeSecretKey) {
  throw new Error('STRIPE_API_KEY is not defined in environment variables');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-04-30.basil',
});

export default stripe;

