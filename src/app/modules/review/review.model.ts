import { model, Schema } from "mongoose";
import { IReview, ReviewModel } from "./review.interface";

const reviewSchema = new Schema<IReview, ReviewModel>(
    {
        service: {
            type: Schema.Types.ObjectId,
            ref: "Post",
            required: true,
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        comment: {
            type: String,
            required: true
        },
        rating: {
            type: Number,
            required: true
        },

    },
    {timestamps: true}
);

export const Review = model<IReview, ReviewModel>("Review", reviewSchema);