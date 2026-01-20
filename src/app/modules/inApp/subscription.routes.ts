import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { inAppPurchaseController } from "./subscription.controller";
const router = express.Router();



router.post("/verify",
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    inAppPurchaseController.verifyPurchase
);
// router.post("/verify/ios",
//     auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
//     inAppPurchaseController.verifyIOSPurchase
// );

router.get("/",
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    inAppPurchaseController.getAllPurchases
);

router.get("/user/:id",

    inAppPurchaseController.getUserPurchases
)

router.get("/:id",
    auth(USER_ROLES.ADMIN),
    inAppPurchaseController.getSinglePurchase
)


export const inAppPurchaseRoutes = router;