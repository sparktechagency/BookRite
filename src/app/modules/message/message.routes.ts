import express, { NextFunction, Request, Response } from 'express';
import { USER_ROLES } from "../../../enums/user";
import auth from "../../middlewares/auth";
import { MessageController } from "./message.controller";
import fileUploadHandler from '../../middlewares/fileUploadHandler';
const router = express.Router()

router.post("/",
    auth(USER_ROLES.USER, USER_ROLES.ADMIN),
    fileUploadHandler(),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const payload = req.body;
            let image;

            if (req.files && 'image' in req.files && req.files.image[0]) {
                image = `/images/${req.files.image[0].filename}`;
            }

            req.body = { ...payload, image };
            next();

        } catch (error) {
            res.status(500).json({ message: "Failed to Upload image" });
        }
    },
    MessageController.sendMessage
)
router.patch("/:id/status", auth(USER_ROLES.USER), MessageController.responseOfferStatus)
router.get("/:id", auth(USER_ROLES.USER), MessageController.getMessage)

export const MessageRoutes = router;