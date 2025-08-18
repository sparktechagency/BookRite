import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { SubscriptionController } from "./subscription.controller";
const router = express.Router();

router.get("/", 
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), 
    SubscriptionController.subscriptions
);

router.get("/details", 
    auth(USER_ROLES.USER), 
    SubscriptionController.subscriptionDetails
);

router.get("/:id", 
    auth(USER_ROLES.USER, USER_ROLES.ADMIN), 
    SubscriptionController.companySubscriptionDetails
)

router.get("/user/:id", 
    auth(USER_ROLES.ADMIN), 
    SubscriptionController.getUserSubscriptionController
)

router.post("/cancel", 
    auth(USER_ROLES.USER), 
    SubscriptionController.cancelSubscription
);

export const SubscriptionRoutes = router;