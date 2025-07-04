
import express from 'express';
import { PaymentController } from './payment.controller';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { PaymentValidation } from '../../middlewares/payment.validation'

const router = express.Router();

// Create payment session
router.post(
  '/create-session',
  auth(),
  validateRequest(PaymentValidation.createPaymentSessionZodSchema),
  PaymentController.createPaymentSession
);

// Get payment status
router.get(
  '/status/:bookingId',
  auth(),
  PaymentController.getPaymentStatus
);

// Create refund (admin or service provider only)
router.post(
  '/refund',
  auth('admin', 'service-provider'),
  validateRequest(PaymentValidation.createRefundZodSchema),
  PaymentController.createRefund
);

// Webhook endpoint - no auth, accessed by Stripe
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    PaymentController.handleStripeWebhooks(req, res).catch(next);
  }
);

export const PaymentRoutes = router;