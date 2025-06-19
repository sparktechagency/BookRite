import express from 'express';
import * as portfolioController from './controller.portfolio';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import fileUploadHandler from '../../middlewares/fileUploadHandler';

const router = express.Router();
const upload = fileUploadHandler();
router.get('/me', auth(USER_ROLES.USER, USER_ROLES.ADMIN), portfolioController.getUserPortfolio);
router.get('/me/:userId', auth(USER_ROLES.USER, USER_ROLES.ADMIN), portfolioController.getPortfolioByProviderId);
router.post('/me', auth(USER_ROLES.USER, USER_ROLES.ADMIN), upload, portfolioController.createOrUpdatePortfolio,);
router.delete('/me/:id', auth(USER_ROLES.USER, USER_ROLES.ADMIN), portfolioController.deletePortfolio);

export const portfolioRoutes = router;
