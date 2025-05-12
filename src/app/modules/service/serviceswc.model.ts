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
    price: {
      type: Number,
      required: false
    },
    category: {
      type: Schema.Types.ObjectId, 
      required: true,
      ref: 'Service'
    },

    User: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: 'User'
    },
    reviews: {
      type: [{
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        comment: { type: String, required: false },
        rating: { type: Number, required: false },
        createdAt: { type: Date, default: Date.now }
      }],
      default: []
    }
  },
  { timestamps: true }
)
export const Servicewc = model<IWcService, ServiceWcModel>('Servicewc', servicewcSchema)
