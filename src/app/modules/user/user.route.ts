import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import fileUploadHandler from '../../middlewares/fileUploadHandler';
import { googleAuthLoginFirebase, googleLoginOrRegisterV2, UserController } from './user.controller';
import { Request, Response } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { UserValidation } from './user.validation';
const router = express.Router();

router.get(
  '/profile',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.SUPER_ADMIN),
  UserController.getUserProfile
);

router.post('/google-auth', googleLoginOrRegisterV2);
router.post('/google-authFirebase', googleAuthLoginFirebase);

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

router.delete(
    '/delete-account',
    auth(USER_ROLES.ADMIN,USER_ROLES.USER),
    UserController.deleteUser
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
  UserController.resendOtp
);

router.put('/location',
    auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    UserController.updateUserLocationController
);
router.get('/location',
    auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    UserController.getUsersWithLocationController
);

export const UserRoutes = router;
