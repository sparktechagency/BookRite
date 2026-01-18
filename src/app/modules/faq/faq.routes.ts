
import express from "express";
import { addFAQ, deleteFAQ, listFAQs, updateFAQ } from "./faq.controller";
import { USER_ROLES } from "../../../enums/user";
import auth from "../../middlewares/auth";
const router = express.Router();

router.post("/", auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),addFAQ);
router.get("/get", auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.USER),listFAQs);
router.put("/update/:id", auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),updateFAQ);
router.delete("/delete/:id",auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN) ,deleteFAQ);


export const FaqRoutes = router
