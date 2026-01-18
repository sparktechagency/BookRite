import mongoose, { Document, Schema, Model } from 'mongoose';
import { IPortfolio } from './interface.porfolio';

const portfolioSchema = new Schema<IPortfolio>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: [String], default: [] },
  },
  { timestamps: true }
);

portfolioSchema.index({});

const Portfolio: Model<IPortfolio> = mongoose.model<IPortfolio>('Portfolio', portfolioSchema);
export default Portfolio