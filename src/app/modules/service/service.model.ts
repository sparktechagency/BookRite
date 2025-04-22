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
  
  },
  { timestamps: true },
)

export const Service = model<IService, ServiceModel>('Service', serviceSchema)