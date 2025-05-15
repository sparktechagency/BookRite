import express, { NextFunction, Request, Response } from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { ReservationController } from "./reservation.controller";
const router = express.Router();

router.route("/")
    .post(
        auth(USER_ROLES.USER),
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                const { price, ...othersPayload } = req.body;

                if (price > 0) {
                    othersPayload.price = Number(price);
                }

                req.body = { ...othersPayload, user: req.user.id };
                next();

            } catch (error) {
                res.status(500).json({ message: "Failed to Convert string to number" });
            }
        },
        ReservationController.createReservation
    )
    .get(
        auth(USER_ROLES.USER), 
        ReservationController.userReservation
    );

export const ReservationRoutes = router;