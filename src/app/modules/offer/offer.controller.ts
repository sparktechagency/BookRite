import { Response, Request } from "express";
import catchAsync from "../../../shared/catchAsync";
import { OfferService } from "./offer.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import generateBookingId from "../../../util/generateBookingId";


const createOffer = catchAsync(async(req: Request, res: Response)=>{
    const offerId = generateBookingId();

    const payloadData = {
        ...req.body,
        user: req.user.id,
        offerId
    };
    const result = await OfferService.createOfferToDB(payloadData);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Offer Create Successfully",
        data: result
    })
})

const getOffer = catchAsync(async(req: Request, res: Response)=>{
    
    const result = await OfferService.getOfferFromDB(req.user);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Offer Retrieved Successfully",
        data: result
    })
})

const offerHistory = catchAsync(async(req: Request, res: Response)=>{
    const result = await OfferService.offerHistoryFromDB(req.user, req.query);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Offer History Retrieved Successfully",
        data: result
    })
})

const getOfferDetails = catchAsync(async(req: Request, res: Response)=>{
    const id = req.params.id;
    const result = await OfferService.getOfferDetailsFromDB(id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Offer History Retrieved Successfully",
        data: result
    })
})

const respondOffer = catchAsync(async(req: Request, res: Response)=>{
    const id = req.params.id;
    const status = req.query.status;
    const result = await OfferService.respondOfferToDB(id, status);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Offer Status updated Successfully",
        data: result
    })
})

const transactionHistory = catchAsync(async(req: Request, res: Response)=>{
    const result = await OfferService.transactionHistoryFromDB(req.user);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Transaction History Retrieved  Successfully",
        data: result
    })
})

export const OfferController = {
    createOffer,
    getOffer,
    respondOffer,
    getOfferDetails,
    offerHistory,
    transactionHistory
}