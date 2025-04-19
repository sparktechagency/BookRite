import { Model, Types } from "mongoose";

export type IReview = {
    service: Types.ObjectId;
    user: Types.ObjectId;
    comment: string;
    rating: number;
}

export type ReviewModel = Model<IReview>;