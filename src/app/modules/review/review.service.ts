import mongoose from "mongoose";
import { IReview } from "./review.interface";
import { Review } from "./review.model";
import ApiError from "../../../errors/ApiError";
import { StatusCodes } from "http-status-codes";
import { Post } from "../post/post.model";
import { Servicewc } from "../service/serviceswc.model";


// const createReviewToDB = async(payload:IReview): Promise<IReview>=>{

//     // Validate ID before making a database call
//     if (!mongoose.Types.ObjectId.isValid(payload.Servicewc as string)) {
//         throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Offer ID');
//     }

//     console.log(payload)

//     // Fetch service and check if it exists in one query
//     const service:any = await Post.findById(payload.Servicewc);
//     if (!service) {
//         throw new ApiError(StatusCodes.NOT_FOUND, "No Service Found");
//     }

//     if (payload.rating) {

//         // checking the rating is valid or not;
//         const rating = Number(payload.rating);
//         if (rating < 1 || rating > 5) {
//             throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid rating value");
//         }

//         // Update service's rating and total ratings count
//         const totalRating = service.totalRating + 1;

//         let newRating;
//         if (service.rating === null || service.rating === 0) {
//             // If no previous ratings, the new rating is the first one
//             newRating = rating;
//         } else {
//             // Calculate the new rating based on previous ratings
//             newRating = ((service.rating * service.totalRating) + rating) / totalRating;
//         }
    
//         service.totalRating = totalRating;
//         service.rating = parseFloat(newRating.toFixed(2));
    
//         // Save the updated salon document
//         await service.save();
//     }

//     const result = await Review.create(payload);
//     if(!result){
//         throw new ApiError(StatusCodes.BAD_REQUEST, "Failed To create Review")
//     }
//     return payload;
// };
const createReviewToDB = async (payload: IReview): Promise<IReview> => {
    // Validate ID before making a database call
    if (!mongoose.Types.ObjectId.isValid(payload.service as unknown as string)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Servicewc ID');
    }

    console.log(payload);

    // Fetch service and check if it exists in one query
    const service: any = await Servicewc.findById(payload.service);
    if (!service) {
        throw new ApiError(StatusCodes.NOT_FOUND, "No Service Found");
    }

    if (payload.rating) {
        const rating = Number(payload.rating);
        if (rating < 1 || rating > 5) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid rating value");
        }

        const totalRating = service.reviews.length + 1;
        let newRating = (service.rating * (totalRating - 1) + rating) / totalRating;

        service.rating = parseFloat(newRating.toFixed(2));
        service.totalRating = totalRating;

        await service.save();
    }

    const newReview = await Review.create(payload);
    if (!newReview) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Failed To create Review");
    }

    service.reviews.push(newReview);
    await service.save();

    return newReview;
};

const getReviewFromDB = async(id:any): Promise<IReview[]>=>{

    // Validate ID before making a database call
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Offer ID');
    }
    
    const reviews = await Review.find({service: id});
    return reviews;
};

export const ReviewService ={ createReviewToDB, getReviewFromDB}