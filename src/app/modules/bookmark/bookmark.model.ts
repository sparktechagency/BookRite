import { model, Schema } from "mongoose";
import { IBookmark, BookmarkModel } from "./bookmark.interface"

const bookmarkSchema = new Schema<IBookmark, BookmarkModel>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        service: {
            type: Schema.Types.ObjectId,
            ref: "Servicewc",
            required: true
        },
            category: {
            type: Schema.Types.ObjectId,
            ref: "Service",
            required: false
        }
    }, 
    {
        timestamps: true
    }
);
bookmarkSchema.index({ user: 1, service: 1 }, { unique: true });

export const Bookmark = model<IBookmark, BookmarkModel>("Bookmark", bookmarkSchema);