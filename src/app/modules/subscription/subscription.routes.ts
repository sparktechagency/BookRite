import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { inAppPurchaseController } from "./subscription.controller";
const router = express.Router();

router.get("/",
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    inAppPurchaseController.getAllPurchases
);

router.post("/verify",
    inAppPurchaseController.verifyAndroidPurchase
);

router.get("user/:id",

    inAppPurchaseController.getUserPurchases
)

router.get("/:id",
    auth(USER_ROLES.ADMIN),
    inAppPurchaseController.getSinglePurchase
)

// router.post("/cancel",
//     auth(USER_ROLES.USER),
//     inAppPurchaseController.cancelSubscription
// );

export const inAppPurchaseRoutes = router;