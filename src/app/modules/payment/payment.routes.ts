import express from 'express';
import { initiatePayment } from './payment.controller'; 
import auth from '../../middlewares/auth'; 
import { USER_ROLES } from '../../../enums/user';

const router = express.Router();


router.post('/paymentLink/:bookingId', auth(USER_ROLES.USER),initiatePayment);


export const paymentRoute = router;
