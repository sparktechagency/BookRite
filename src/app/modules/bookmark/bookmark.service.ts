import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import { IBookmark } from "./bookmark.interface";
import { Bookmark } from "./bookmark.model";
import { JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";
import { NextFunction } from "express";
import { Request, Response } from "express";

export const toggleBookmark = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as JwtPayload;

    if (!payload.user || !payload.service) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Missing user or service in request payload',
      });
    }

    const existingBookmark: any = await Bookmark.findOne({
      user: payload.user,
      service: payload.service,
    });

    if (existingBookmark) {
      await Bookmark.findByIdAndDelete(existingBookmark._id);
       res.status(StatusCodes.OK).json({
        success: true,
        message: 'Bookmark removed successfully',
      });
    } else {
      const result = await Bookmark.create(payload);
      if (!result) {
         res.status(StatusCodes.EXPECTATION_FAILED).json({
          success: false,
          message: 'Failed to add bookmark',
        });
      }

       res.status(StatusCodes.CREATED).json({
        success: true,
        message: 'Bookmark added successfully',
      });
    }
  } catch (error) {
    console.error('Error in toggleBookmark:', error);
     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'An error occurred while toggling the bookmark',
      error: error instanceof Error ? error.message : error,
    });
  }
};

// const toggleBookmark = async (payload: { user: string; service: string }): Promise<string> => {
//   const session = await mongoose.startSession();
//   session.startTransaction();
  
//   try {
//     const existingBookmark = await Bookmark.findOneAndDelete({
//       user: payload.user,
//       service: payload.service
//     }).session(session);

//     if (!existingBookmark) {
//       await Bookmark.create([payload], { session });
//       await session.commitTransaction();
//       return "Bookmark added successfully";
//     }
    
//     await session.commitTransaction();
//     return "Bookmark removed successfully";
//   } catch (error) {
//     await session.abortTransaction();
//     throw new ApiError(StatusCodes.EXPECTATION_FAILED, "Failed to toggle bookmark");
//   } finally {
//     session.endSession();
//   }
// };


const getBookmark = async (user: JwtPayload): Promise<IBookmark[]> => {
  const result = await Bookmark.find({ user: user?.id })
    .populate({
      path: 'service', 
      select: 'serviceName price image location reviews category', 

    })
    .populate({
      path: 'user', 
      select: 'location', 
    })
    .select("service CategoryName ") 
      
    .populate({
      path: 'category', 
      select: 'location', 
    })
    .select("service CategoryName ") 


  return result;
}


export const BookmarkService = {toggleBookmark, getBookmark}