import { Model } from 'mongoose';

export type IService = {
  name: string;
  image: string;
}

export type ServiceModel = Model<IService, Record<string, unknown>>