import { model, Schema } from 'mongoose'
import { IService, ServiceModel } from './service.interface'

const serviceSchema = new Schema<IService, ServiceModel>(
  {
    CategoryName: {
      type: String,
      required: true,
      unique: true,
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