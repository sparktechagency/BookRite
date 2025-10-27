import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { inAppPurchaseController } from "./subscription.controller";
const router = express.Router();

router.get("/",
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    inAppPurchaseController.getAllPurchasesController
);

router.post("/verify",
    inAppPurchaseController.verifyAndroidPurchaseController
);

router.get("user/:id",

    inAppPurchaseController.getUserPurchasesController
)

router.get("/:id",
    auth(USER_ROLES.ADMIN),
    inAppPurchaseController.getSinglePurchaseController
)

// router.post("/cancel",
//     auth(USER_ROLES.USER),
//     inAppPurchaseController.cancelSubscription
// );

export const inAppPurchaseRoutes = router;