import mongoose, { Document, Schema, Model } from 'mongoose';
import { IPortfolio } from './interface.porfolio';



const portfolioSchema = new Schema<IPortfolio>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true }, 
    title: { type: String, required: true },
    description: { type: String },
    skills: [{ type: String }],
    projects: [
      {
        name: { type: String, required: true },
        description: { type: String },
        link: { type: String }
      }
    ],
    images: [{ type: String }]
  },
  { timestamps: true }
);

const Portfolio: Model<IPortfolio> = mongoose.model<IPortfolio>('Portfolio', portfolioSchema);
export default Portfolio;
