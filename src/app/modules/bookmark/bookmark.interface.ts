import { Model, Types } from "mongoose";

export type IBookmark= {
    user: Types.ObjectId,
    service: Types.ObjectId,
    category: Types.ObjectId
}

export type BookmarkModel = Model<IBookmark>;