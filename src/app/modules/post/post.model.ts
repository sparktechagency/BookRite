import { model, Schema } from 'mongoose';
import { IPost, PostModal } from './post.interface';

const postSchema = new Schema<IPost, PostModal>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    price_breakdown: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true
    },
    location: {
      type: String,
      required: true
    },
    adult: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      default: 0
    },
    totalRating: {
      type: Number,
      required: false,
      default: 0
    }
  },
  { timestamps: true }
);

//exist user check
postSchema.statics.isExistPostById = async (id: string) => {
  const isExist = await Post.findById(id);
  return isExist;
};

export const Post = model<IPost, PostModal>('Post', postSchema);