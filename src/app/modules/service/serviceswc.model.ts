// import { model, Schema } from 'mongoose'
// import {IWcService,ServiceWcModel  } from './servicewc.interface'

// const servicewcSchema = new Schema<IWcService, ServiceWcModel>(
//   {

//     serviceName: {
//       type: String,
//       required: true,
//       unique: true,
//     },
//     serviceDescription: {
//       type: String,
//       required: true,
//     },
//     image: {
//       type: String,
//       required: true
//     },
//     category: {
//       type: String,
//       required: true,
//       ref: 'Service'
//     },
  
//   },
//   { timestamps: true },
// )

// export const Service = model<IWcService, ServiceWcModel>('Servicewc', servicewcSchema)

import { model, Schema, Types } from 'mongoose'
import { IWcService, ServiceWcModel } from './servicewc.interface'

const servicewcSchema = new Schema<IWcService, ServiceWcModel>(
  {
    serviceName: {
      type: String,
      required: true,
      unique: true,
    },
    serviceDescription: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true
    },
    category: {
      type: Schema.Types.ObjectId, 
      required: true,
      ref: 'Service'
    },
  },
  { timestamps: true },
)
export const Service = model<IWcService, ServiceWcModel>('Servicewc', servicewcSchema)