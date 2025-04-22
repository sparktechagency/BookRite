// import { Model } from 'mongoose';

// export type IWcService = {
//   serviceName: string;
//   serviceDescription: string;
//   image: string;
//   category: string,
// }

// export type ServiceWcModel = Model<IWcService, Record<string, unknown>>

import { Model, Types } from 'mongoose';

export type IWcService = {
  serviceName: string;
  serviceDescription: string;
  image: string;
  category: Types.ObjectId; 
}

export type ServiceWcModel = Model<IWcService, Record<string, unknown>>