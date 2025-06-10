import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import { IBookmark } from "./bookmark.interface";
import { Bookmark } from "./bookmark.model";
import { JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";

const toggleBookmark = async (payload: JwtPayload): Promise<string> => {

    // Check if the bookmark already exists
    const existingBookmark:any = await Bookmark.findOne({
        user: payload.user,
        service: payload.service
    });

    if (existingBookmark) {

        // If the bookmark exists, delete it
        await Bookmark.findByIdAndDelete(existingBookmark._id);
        return "Bookmark Remove successfully";
    } else {

        // If the bookmark doesn't exist, create it
        const result = await Bookmark.create(payload);
        if (!result) {
            throw new ApiError(StatusCodes.EXPECTATION_FAILED, "Failed to add bookmark");
        }
        return "Bookmark Added successfully";
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