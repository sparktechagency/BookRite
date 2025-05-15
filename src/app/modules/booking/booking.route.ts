import express from 'express';
import { BookingController,} from './booking.controller';
import { USER_ROLES } from '../../../enums/user';

import auth from '../../middlewares/auth';

const router = express.Router();

// Route to create a booking
router.post('/', auth(USER_ROLES.USER),BookingController.createBooking);
router.put('/:bookingId', auth(USER_ROLES.USER, USER_ROLES.ADMIN),BookingController.updateBookingStatus);
router.get('/:serviceId',BookingController.getSertviceById);

// Route to get all bookings for a specific user
router.get('/',auth(USER_ROLES.USER), BookingController.getUserBookings);

export default router;
export const BookingRoutes = router;