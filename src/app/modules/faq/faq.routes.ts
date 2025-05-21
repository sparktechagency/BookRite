
import express from "express";
import { addFAQ, deleteFAQ, listFAQs, updateFAQ } from "./faq.controller";
import { USER_ROLES } from "../../../enums/user";
import auth from "../../middlewares/auth";
const router = express.Router();

router.post("/", auth(USER_ROLES.ADMIN),addFAQ);
router.get("/get", auth(USER_ROLES.ADMIN),listFAQs);
router.put("/update", auth(USER_ROLES.ADMIN),updateFAQ);
router.delete("/delete",auth(USER_ROLES.ADMIN) ,deleteFAQ);


export const FaqRoutes = router
