import { Model, Types } from 'mongoose';

export type IService = {
  CategoryName: string;
  image: string;
   User: Types.ObjectId;
}

export type ServiceModel = Model<IService, Record<string, unknown>>