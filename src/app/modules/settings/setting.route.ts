
import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { settingsController } from './setting.controller';
const SettingsRouter = express.Router();

SettingsRouter
    // .get('/privacy-policy', settingsController.getPrivacyPolicy)
    .get('/account-delete-policy', settingsController.getAccountDelete)
// .get('/support', settingsController.getSupport);

export default SettingsRouter;