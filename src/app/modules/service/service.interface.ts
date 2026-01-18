import { Model, Types } from 'mongoose';

export type IService = {
  _id: Types.ObjectId;
  CategoryName: string;
  image: string;
  User: Types.ObjectId;
   price: number
   createdAt: Date;
   updatedAt: Date
   
}

export type ServiceModel = Model<IService, Record<string, unknown>>