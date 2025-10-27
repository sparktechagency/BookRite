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
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET
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
    stripe_api_secret: process.env.STRIPE_API_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    clientUrl: process.env.FRONTEND_URL,
    paymentSuccess: `${process.env.FRONTEND_URL}/payment-success`,
    paymentCancel: `${process.env.FRONTEND_URL}/payment/cancel`,
  },

  inapp: {
    ANDROID_PACKAGE_NAMES: process.env.ANDROID_PACKAGE_NAME,
    GOOGLE_PRIVATE_KEYS: process.env.GOOGLE_PRIVATE_KEY,
    GOOGLE_CLIENT_EMAILS: process.env.GOOGLE_CLIENT_EMAIL
  }

};
