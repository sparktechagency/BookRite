import express from 'express';
import { BookingController } from './booking.controller';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { getTimeSlots } from './aviliability.controller';


const router = express.Router();

router.post('/', auth(USER_ROLES.USER), BookingController.createBooking);

router.get('/booking-status',
  auth(USER_ROLES.ADMIN),
  BookingController.getBookingStatusSummary
);


router.put('/:bookingId', auth(USER_ROLES.USER, USER_ROLES.ADMIN), BookingController.updateBookingStatus);
router.get('/service/:bookingId', auth(USER_ROLES.USER, USER_ROLES.ADMIN), BookingController.getBookingById);
router.get('/userstate', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), BookingController.getMonthlyUserStats);
router.get('/getAllBookings', auth(USER_ROLES.SUPER_ADMIN,USER_ROLES.ADMIN), BookingController.getAllBookings);
router.get('/bookingstate', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), BookingController.getMonthlyBookingStats);
router.get('/monthlyEarning', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), BookingController.getMonthlyEarnings);

// Place fixed routes first:
router.get('/total-service', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), BookingController.getTotalBookingsCount);
router.get('/with-user/:serviceId', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), BookingController.getServiceBookingsWithUser);
  
// Then param routes last:
router.get('/:serviceId',auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), BookingController.getBookingsByServiceId);

// Route to get all bookings for a specific user
router.get('/', auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), BookingController.getUserBookings);
router.get('/by/:userId', auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), BookingController.getUserBookingsById);
//location
router.get('/location/:bookingId', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.USER), BookingController.getBookingLocation);

//cancelled bookings
router.delete('/cancelled/:bookingId', auth(USER_ROLES.ADMIN, USER_ROLES.USER,USER_ROLES.SUPER_ADMIN), BookingController.cancelBooking);

router.get(
  '/service-provider/:serviceProviderId/time-slots/:bookingDate',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.USER),
  async (req, res, next) => {
    try {
      await getTimeSlots(req, res);
    } catch (err) {
      next(err);
    }
  }
);
//serviceprovider information get
router.get(
  '/service-provider/:userId',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.USER),
  BookingController.getUserEarnings
);




router.get(
  '/admin/booking-status/details',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.USER),
  BookingController.getBookingStatusSummaryDetails
);

// router.get(
//   '/dayaviliability',
//   auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
//   getAvailabilityWithAllDays
// );

export default router;
export const BookingRoutes = router;
