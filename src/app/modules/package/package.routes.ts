import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { PackageController } from "./package.controller";
import validateRequest from "../../middlewares/validateRequest";
import { PackageValidation } from "./package.validation";
import fileUploadHandler from "../../middlewares/fileUploadHandler";
const router = express.Router()

router
    .route("/")
    .patch(
        fileUploadHandler(),
        auth(USER_ROLES.SUPER_ADMIN),
        validateRequest(PackageValidation.createPackageZodSchema),
        PackageController.createPackage
    )
    .get(PackageController.getPackage)

router
    .route("/:id")
    .put(auth(USER_ROLES.SUPER_ADMIN), PackageController.updatePackage)
    .delete(auth(USER_ROLES.SUPER_ADMIN), PackageController.deletePackage)

export const PackageRoutes = router;