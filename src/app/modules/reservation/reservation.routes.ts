import express from 'express';
import { getAllUserBookingsForAdmin } from '../reservation/reservation.controller'; 
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';

const router = express.Router();


router.get('/admin/bookings', auth(USER_ROLES.ADMIN), getAllUserBookingsForAdmin);

export const ReservationRoutes = router;
