import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
  ip_address: process.env.IP_ADDRESS,
  database_url: process.env.DATABASE_URL,
  node_env: process.env.NODE_ENV,
  port: process.env.PORT,
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,

  mercado_secret: process.env.MERCADO_SECRET_KEY,
  jwt: {
    jwt_secret: process.env.JWT_SECRET,
    jwt_expire_in: process.env.JWT_EXPIRE_IN,
  },
  email: {
    from: process.env.EMAIL_FROM,
    user: process.env.EMAIL_USER,
    port: process.env.EMAIL_PORT,
    host: process.env.EMAIL_HOST,
    pass: process.env.EMAIL_PASS,
  },
  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD
  },
  stripe: {
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    paymentSuccess: process.env.PAYMENT_SUCCESS,
    stripe_api_secret: process.env.STRIPE_API_KEY,
    clientUrl: process.env.CLIENT_URL,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },

};
