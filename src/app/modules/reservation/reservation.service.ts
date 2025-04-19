import { JwtPayload } from "jsonwebtoken";
import { IReservation } from "./reservation.interface";
import { Reservation } from "./reservation.model";

const createReservationToDB = async (payload: IReservation): Promise<IReservation> => {
    const reservation = await Reservation.create(payload);
    if (!reservation) throw new Error('Failed to created Reservation ');
    return reservation;
};

const userReservationFromDB = async (user: JwtPayload, status: string): Promise<IReservation[]> => {

    const condition:any = {
        barber: user.id
    }

    if(status) {
        condition['status'] = status;
    }

    const reservation = await Reservation.find(condition)
        .populate([
            {
                path: 'customer',
                select: "name"
            },
            {
                path: 'service',
                populate: [
                    {
                        path: "title",
                        select: "title"
                    },
                    {
                        path: "category",
                        select: "name"
                    },
                ]
            }
        ])
        .select("customer service createdAt status price");


    if (!reservation) throw [];
    return reservation;
}

export const ReservationService = {
    createReservationToDB,
    userReservationFromDB
}