import  express  from "express";
import auth from "../../middlewares/auth";
import { ChatController } from "./chat.controller";
import { USER_ROLES } from "../../../enums/user";
const router= express.Router();

router.get("/", auth(USER_ROLES.USER), ChatController.getChat);
router.post("/:id", auth(USER_ROLES.USER), ChatController.createChat);

export const ChatRoutes = router