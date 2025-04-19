import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import { IBookmark } from "./bookmark.interface";
import { Bookmark } from "./bookmark.model";
import { JwtPayload } from "jsonwebtoken";

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


const getBookmark = async (user: JwtPayload): Promise<IBookmark[]>=>{

    const result:any = await Bookmark.find({ user: user?.id })
        .populate({
            path: 'service',
            select: 'location totalRating category rating image'
        }).select("service")
    
    return result;
}

export const BookmarkService = {toggleBookmark, getBookmark}