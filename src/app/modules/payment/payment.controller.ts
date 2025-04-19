import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { PaymentService } from "./payment.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";


const createPaymentIntentToMercado = catchAsync(async(req: Request, res: Response)=>{

    const payload = req.body;
    const result = await PaymentService.createPaymentIntentToMercado(payload);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Payment Checkout Created Successfully",
        data: result
    })
    
});

export const PaymentController = {
    createPaymentIntentToMercado
}