import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { VerifyBodySchema } from "./validation";
import { InAppPurchaseService } from "./subscription.service";

const verifyAndroidPurchase = catchAsync(async (req: Request, res: Response) => {
    const parsed = VerifyBodySchema.safeParse(req.body);
    if (!parsed.success) {
        return sendResponse(res, {
            success: false,
            statusCode: StatusCodes.BAD_REQUEST,
            message: "Validation error",
            data: parsed.error.flatten(),
        });
    }
    const { userId, source, verificationData } = parsed.data;

    if (source !== "google_play") {
        return sendResponse(res, {
            success: false,
            statusCode: StatusCodes.BAD_REQUEST,
            message: "Invalid source",
            data: null,
        });
    }

    const pkg = process.env.ANDROID_PACKAGE_NAME!;
    if (verificationData.packageName !== pkg) {
        return sendResponse(res, {
            success: false,
            statusCode: StatusCodes.BAD_REQUEST,
            message: "Package name mismatch",
            data: null,
        });
    }

    const result = await InAppPurchaseService.verifyAndroidPurchaseToDB({
        userId,
        verificationData,
    });

    return sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: "Purchase verified successfully",
        data: result,
    });
});

const getAllPurchases = catchAsync(async (req: Request, res: Response) => {
    const {
        userId,
        productId,
        platform,
        status,
        search,
        page = "1",
        limit = "20",
        sort = "-createdAt",
    } = req.query as any;

    const data = await InAppPurchaseService.listPurchasesFromDB(
        { userId, productId, platform, status, search },
        Number(page),
        Number(limit),
        String(sort)
    );

    return sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: "Purchases retrieved successfully",
        data,
    });
});

const getUserPurchases = catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { page = "1", limit = "20", sort = "-createdAt" } = req.query as any;

    const data = await InAppPurchaseService.listPurchasesByUserFromDB(
        userId,
        Number(page),
        Number(limit),
        String(sort)
    );

    return sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: "User purchases retrieved successfully",
        data,
    });
});

const getSinglePurchase = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const doc = await InAppPurchaseService.getPurchaseByIdFromDB(id);
    if (!doc) {
        return sendResponse(res, {
            success: false,
            statusCode: StatusCodes.NOT_FOUND,
            message: "Purchase not found",
            data: null,
        });
    }

    return sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: "Purchase retrieved successfully",
        data: doc,
    });
});

export const inAppPurchaseController = {
    verifyAndroidPurchase,
    getAllPurchases,
    getUserPurchases,
    getSinglePurchase,
};
