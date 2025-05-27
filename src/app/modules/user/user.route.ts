import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import fileUploadHandler from '../../middlewares/fileUploadHandler';
import { UserController } from './user.controller';
import validateRequest from '../../middlewares/validateRequest';
import { UserValidation } from './user.validation';
const router = express.Router();

router.get(
  '/profile',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.SUPER_ADMIN),
  UserController.getUserProfile
);

router.post(
  '/create-admin',
  validateRequest(UserValidation.createAdminZodSchema),
  UserController.createAdmin
);
router.post(
  '/create-super-admin',
  validateRequest(UserValidation.createAdminZodSchema),
  UserController.createSuperAdmin
);

router
  .route('/')
  .post(
    UserController.createUser
  )
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.SUPER_ADMIN),
    fileUploadHandler(),
    UserController.updateProfile
  );
  //resend otp
router.post(
  '/resend-otp',
  validateRequest(UserValidation.createAdminZodSchema),
  UserController.resendOtp
);

export const UserRoutes = router;
