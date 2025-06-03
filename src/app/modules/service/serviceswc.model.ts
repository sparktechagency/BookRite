
import { model, Schema, Types } from 'mongoose'
import { IWcService, ServiceWcModel } from './servicewc.interface'

const servicewcSchema = new Schema<IWcService, ServiceWcModel>(
  {
    User: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    Bookmark: { type: Schema.Types.ObjectId, ref: 'Bookmark', required: false },
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

    category: { type: Schema.Types.ObjectId, required: true, ref: 'Service' },
    reviews: {
      type: [{
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        comment: { type: String, required: false },
        rating: { type: Number, required: false },
        createdAt: { type: Date, default: Date.now }
      }],
      default: []
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    location: {
      type: String,
      required: true
    },
  },
  { timestamps: true }
)
export const Servicewc = model<IWcService, ServiceWcModel>('Servicewc', servicewcSchema)
