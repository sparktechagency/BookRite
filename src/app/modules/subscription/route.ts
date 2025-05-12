import express from 'express';
import { SubscriptionController } from './controller.subscription';
import  auth  from '../../middlewares/auth';

const router = express.Router();
const subscriptionController = new SubscriptionController();

router.post('/create-plan', auth('SUPER_ADMIN'), subscriptionController.createSubscriptionPlan);

router.post('/create-checkout', auth('ADMIN'), subscriptionController.createCheckoutSession);


router.post('/stripe/webhook', subscriptionController.handleStripeWebhook);

export const SubscriptionRoutes = router;
