import { model, Schema } from "mongoose";
import { IReview, ReviewModel } from "./review.interface";

const reviewSchema = new Schema<IReview, ReviewModel>(
    {
        service: {
            type: Schema.Types.ObjectId,
            ref: "Servicewc",
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
            type: String,
            required: true,
            default: "0.0",
        },

        totalRating: { rating: { type: Number, default: 0 }, count: { type: Number, default: 0 } },
    },
    {timestamps: true}
);

export const Review = model<IReview, ReviewModel>("Review", reviewSchema);