import { model, Schema } from "mongoose";
import { IOffer, OfferModel } from "./offer.interface";
import { randomBytes } from "crypto";

const offerSchema = new Schema<IOffer, OfferModel>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        provider: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        service: {
            type: Schema.Types.ObjectId,
            ref: "Post",
            required: true
        },
        status: {
            type: String,
            enum: ["Upcoming", "Accepted", "Canceled", "Completed"],
            default: "Upcoming",
            required: true
        },
        paymentStatus: {
            type: String,
            enum: [ "Pending", "Paid", "Refunded"],
            default: "Pending"
        },
        price: {
            type: Number,
            required: true
        },
        txid: {
            type: String,
            unique: true,
            index: true
        },
        description: {
            type: String,
            required: false
        },
        offerId: {
            type: String,
            required: false
        }
    },
    {
        timestamps: true
    }
)


offerSchema.pre("save", async function (next) {
    const offer = this as IOffer;

    if ((offer as any).isNew && !offer.txid) {
        const prefix = "tx_";
        const uniqueId = randomBytes(8).toString("hex");
        offer.txid = `${prefix}${uniqueId}`;
    }

    next();
});

export const Offer = model<IOffer, OfferModel>("Offer", offerSchema);