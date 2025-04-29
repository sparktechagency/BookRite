// import { Model } from 'mongoose';

// export type IWcService = {
//   serviceName: string;
//   serviceDescription: string;
//   image: string;
//   category: string,
// }

// export type ServiceWcModel = Model<IWcService, Record<string, unknown>>

import { Model, Schema, Types } from 'mongoose';

export type IWcService = {
  serviceName: string;
  serviceDescription: string;
  image: string;
  price: number;
  category: Types.ObjectId; 
  User: Types.ObjectId;
  reviews: {
    findIndex(arg0: (review: any) => boolean): unknown;
    push(arg0: { user: any; comment: any; rating: any; createdAt: Date; }): unknown;
    type: [{
      user: { type: Schema.Types.ObjectId, ref: 'User' },
      comment: { type: String, required: false },
      rating: { type: Number, required: false },
    }],
    default: []
  };
}

export type ServiceWcModel = Model<IWcService, Record<string, unknown>>