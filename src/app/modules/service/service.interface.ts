import { Model } from 'mongoose';

export type IService = {
  CategoryName: string;
  image: string;
}

export type ServiceModel = Model<IService, Record<string, unknown>>