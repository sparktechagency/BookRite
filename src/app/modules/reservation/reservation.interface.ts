import { Model, Types } from "mongoose"

export type IReservation = {
    provider: Types.ObjectId;
    user: Types.ObjectId;
    service: Types.ObjectId;
    status: "Upcoming" | "Accepted" | "Canceled" | "Completed";
    paymentStatus: "Pending" | "Paid" | "Refunded";
    price: number;
    txid: string;
}

export type ReservationModel = Model<IReservation, Record<string, unknown>>;