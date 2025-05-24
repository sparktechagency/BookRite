import { model, Schema, Types } from 'mongoose'
import { IService, ServiceModel } from './service.interface'

const serviceSchema = new Schema<IService, ServiceModel>(
  {
    // _id: Types.ObjectId,
    CategoryName: {
      type: String,
      required: true,
      unique: true,
    },
    //price reference from servicewc
    price: {
      type: Number,
      required: false,
    },

      image: {
      type: String,
      required: true
    },
    User: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  
  },
  { timestamps: true },
)

export const Service = model<IService, ServiceModel>('Service', serviceSchema)