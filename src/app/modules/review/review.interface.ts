import { Model, ObjectId, Types } from "mongoose";

export type IReview = {
    [x: string]: string | number | ObjectId | Uint8Array<ArrayBufferLike> | Types.ObjectId;
    service: Types.ObjectId;
    user: Types.ObjectId;
    comment: string;
    rating: number;
}

export type ReviewModel = Model<IReview>;