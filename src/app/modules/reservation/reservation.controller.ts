import e, { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { ReservationService } from "./reservation.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";

const createReservation = catchAsync(async (req: Request, res: Response) => {
    const reservation = await ReservationService.createReservationToDB(req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Reservation created successfully",
        data: reservation
    })
}); 

const userReservation = catchAsync(async (req: Request, res: Response) => {
    const reservation = await ReservationService.userReservationFromDB(req.user, req.query.status as string);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Reservation created successfully",
        data: reservation
    })
});

export const ReservationController = {
    createReservation,
    userReservation
}