import { Model, Types } from "mongoose"

export type IOffer = {
    user: Types.ObjectId,
    provider: Types.ObjectId,
    service: Types.ObjectId;
    status: "Upcoming" | "Accepted" | "Canceled" | "Completed";
    paymentStatus: "Pending" | "Paid" | "Refunded";
    price: number;
    txid: string;
    offerId?: string;
    description?: string;
}

export type OfferModel = Model<IOffer>;