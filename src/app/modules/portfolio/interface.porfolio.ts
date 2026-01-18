import mongoose from "mongoose";

export interface IPortfolio extends mongoose.Document {
  userId: mongoose.Types.ObjectId;        
  name: string;
  description?: string;
  image: string[];        
  updatedAt: Date;
  createdAt: Date;
}