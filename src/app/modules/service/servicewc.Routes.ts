import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import fileUploadHandler from '../../middlewares/fileUploadHandler';
import validateRequest from '../../middlewares/validateRequest';
import { ServiceWcController } from './servicewc.controller';
import { ServiceWcValidation } from './servicewc.validation';

const router = express.Router();

router.post(
  '/create-servicewc',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.USER),
  fileUploadHandler(),
  validateRequest(ServiceWcValidation.createServiceZodSchema),
  ServiceWcController.createServiceWc,
);

router
  .route('/:id')
  .patch(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.USER),
    fileUploadHandler(),
    ServiceWcController.updateServiceWc,
  )
  .delete(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.USER),
    ServiceWcController.deleteServiceWc,
  );

router.get(
  '/',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.USER),
  ServiceWcController.getServiceWcs,
);

router.get(
  '/highest-rated',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.USER),
    ServiceWcController.getHighestRated,
);
// router.post("/rating", 
//   auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.USER), 
//   ServiceWcController.userRating);

export const WcServiceRoutes = router;
