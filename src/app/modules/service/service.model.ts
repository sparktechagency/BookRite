import { model, Schema } from 'mongoose'
import { IService, ServiceModel } from './service.interface'

const serviceSchema = new Schema<IService, ServiceModel>(
  {
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
  
  },
  { timestamps: true },
)

export const Service = model<IService, ServiceModel>('Service', serviceSchema)