import express from 'express';
import * as portfolioController from './controller.portfolio';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';

const router = express.Router();

router.get('/me', auth(USER_ROLES.USER, USER_ROLES.ADMIN), portfolioController.getUserPortfolio);
router.post('/me', auth(USER_ROLES.USER, USER_ROLES.ADMIN), portfolioController.createOrUpdatePortfolio);
router.delete('/me/:id', auth(USER_ROLES.USER, USER_ROLES.ADMIN), portfolioController.deletePortfolio);

export const portfolioRoutes = router;
