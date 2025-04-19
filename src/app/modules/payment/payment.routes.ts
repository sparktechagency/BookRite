import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { PaymentController } from "./payment.controller";
const router = express.Router();

router.post("/create-payment", auth(USER_ROLES.USER), PaymentController.createPaymentIntentToMercado);

export const PaymentRoutes = router;