import express, { NextFunction, Request, Response } from 'express';
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { OfferController } from "./offer.controller";
const router = express.Router();

router.get("/offer-history", auth(USER_ROLES.USER), OfferController.offerHistory);
router.get("/transaction-history", auth(USER_ROLES.USER), OfferController.transactionHistory);

router.route('/')
  .post(
    auth(USER_ROLES.USER),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const { price, ...otherPayload } = req.body;

        req.body = { ...otherPayload, user: req.user.id, price: Number(price) };
        next();

      } catch (error) {
        res.status(500).json({ message: "Failed to convert string to number" });
      }
    },
    OfferController.createOffer
  )
  .get(auth(USER_ROLES.USER), OfferController.getOffer)

router
  .route('/:id')
  .patch(auth(USER_ROLES.USER), OfferController.respondOffer)
  .get(auth(USER_ROLES.USER), OfferController.getOfferDetails)


export const OfferRouter = router;