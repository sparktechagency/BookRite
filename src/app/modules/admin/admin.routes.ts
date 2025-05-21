import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { AdminController } from "./admin.controller";
import validateRequest from "../../middlewares/validateRequest";
import { AdminValidation } from "./admin.validation";
const router = express.Router();

// router.post("/create-super-admin", validateRequest(AdminValidation.createAdminZodSchema), AdminController.createSuperAdmin);
router.post("/create-admin", auth(USER_ROLES.SUPER_ADMIN), validateRequest(AdminValidation.createAdminZodSchema), AdminController.createAdmin);
router.get("/users", auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), AdminController.userList);
router.get("/users-admin", auth(USER_ROLES.SUPER_ADMIN), AdminController.userListAdmin);
// router.get("/bookings", auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), AdminController.bookingList); //offer
router.get('/get-bookings', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),AdminController.getBookings,);
router.patch('/accept-booking/:bookingId', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),AdminController.acceptBooking,);
router.get("/transactions", auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), AdminController.transactionList);
router.get("/booking-summary", auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), AdminController.bookingSummary);
router.get("/earning-statistic", auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), AdminController.earningStatistic);
router.get("/user-statistic", auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), AdminController.userStatistic);
router.get("/get-admin", auth(USER_ROLES.SUPER_ADMIN), AdminController.getAdmin);
router.delete("/:id", auth(USER_ROLES.SUPER_ADMIN), AdminController.deleteAdmin);

export const AdminRoutes = router;