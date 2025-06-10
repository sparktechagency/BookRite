import express from 'express';
import { BookingController } from './booking.controller';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';

const router = express.Router();

router.post('/', auth(USER_ROLES.USER), BookingController.createBooking);
router.put('/:bookingId', auth(USER_ROLES.USER, USER_ROLES.ADMIN), BookingController.updateBookingStatus);
router.get('/userstate', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), BookingController.getMonthlyUserStats);
router.get('/getAllBookings', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), BookingController.getAllBookings);
router.get('/bookingstate', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), BookingController.getMonthlyBookingStats);
router.get('/monthlyEarning', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), BookingController.getMonthlyEarnings);

// Place fixed routes first:
router.get('/total-service', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), BookingController.getTotalBookingsCount);
router.get('/with-user/:serviceId', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), BookingController.getServiceBookingsWithUser);

// Then param routes last:
router.get('/:serviceId',auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), BookingController.getBookingsByServiceId);

// Route to get all bookings for a specific user
router.get('/', auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), BookingController.getUserBookings);
//location
router.get('/location/:bookingId', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.USER), BookingController.getBookingLocation);

//cancelled bookings
router.put('/cancelled/:bookingId', auth(USER_ROLES.ADMIN, USER_ROLES.USER), BookingController.cancelBooking);


export default router;
export const BookingRoutes = router;
