import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import { MessageService } from "./message.service";


const sendMessage = catchAsync(async(req: Request, res:Response)=>{
    const user = req.user.id;

    const payload = {
        ...req.body,
        sender: user
    }

    const message = await MessageService.sendMessageToDB(payload);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Send Message Successfully",
        data: message
    })
});

const getMessage= catchAsync(async(req: Request, res:Response)=>{

    const messages = await MessageService.getMessageFromDB(req.params.id, req.query);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Message Retrieve Successfully",
        data: messages
    })
});

const responseOfferStatus = catchAsync(async(req: Request, res:Response)=>{

    const id = req.params.id;
    const status = req.query.status as string;

    const messages = await MessageService.responseOfferStatusToDB(id, status);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: `Offer ${status} Successfully`,
        data: messages
    })
});

export const MessageController = {sendMessage, getMessage, responseOfferStatus}