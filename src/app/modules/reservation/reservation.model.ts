import { Schema, model } from "mongoose";
import { IReservation, ReservationModel } from "./reservation.interface";
import { randomBytes } from "crypto";

const ReservationSchema = new Schema<IReservation, ReservationModel>(
    {
        provider: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        service: {
            type: Schema.Types.ObjectId,
            ref: "Port",
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
            index: true,
            required: true
        }

    },
    { timestamps: true }
);


ReservationSchema.pre("save", async function (next) {
    const reservation = this;

    if (reservation.isNew && !reservation.txid) {
        const prefix = "tx_";
        const uniqueId = randomBytes(8).toString("hex");
        reservation.txid = `${prefix}${uniqueId}`;
    }

    next();
});

export const Reservation = model<IReservation, ReservationModel>("Reservation", ReservationSchema);