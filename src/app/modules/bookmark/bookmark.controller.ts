import { NextFunction, Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { BookmarkService } from "./bookmark.service";
import ApiError from "../../../errors/ApiError";
import { StatusCodes } from "http-status-codes";

const toggleBookmark = catchAsync(async (req: Request, res: Response) => {
  const user = req.user?.id || req.user?._id;
  const service = req.params.id;
  const { bookmark } = req.body; 

  if (!user || !service || typeof bookmark !== 'boolean') {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Missing or invalid input");
  }

  const message = await BookmarkService.toggleBookmark(user, service, bookmark);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message,
  });
});




const getBookmark = catchAsync(async(req: Request, res: Response)=>{
    const user = req.user;
    const result = await BookmarkService.getBookmark(user);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Bookmark Retrieved Successfully",
        data: result
    })
});


export const BookmarkController = {toggleBookmark, getBookmark}