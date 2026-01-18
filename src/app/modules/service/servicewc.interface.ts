
import { Model, Schema, Types } from 'mongoose';

export type IWcService = {
  User?: undefined;
  Bookmark?: undefined;
  // _id: Types.ObjectId;
  userId:Types.ObjectId,
  serviceName: string;
  serviceDescription: string;
  image: string;
  price: number;
  category: Types.ObjectId; 
  location: string;
  timeSlot?: string; 
  // User: Types.ObjectId;
  reviews: {
    findIndex(arg0: (review: any) => boolean): unknown;
    push(arg0: { user: any; comment: any; rating: any; createdAt: Date; }): unknown;
    type: [{
      user: { type: Schema.Types.ObjectId, ref: 'User' },
      comment: { type: String, required: false },
      rating: { type: String, required: false },
    }],
    default: []
  };
   serviceProvider?: {
    _id: string;
    name: string;
  };
  totalRating?: Types.ObjectId; 

  createdAt: Date;
  updatedAt: Date;
}

export type ServiceWcModel = Model<IWcService, Record<string, unknown>>