import mongoose from "mongoose";

export interface IPortfolio extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  skills?: string[];       
  projects?: {             
    name: string;
    description?: string;
    link?: string;
  }[];
  images?: string[];        
  updatedAt: Date;
  createdAt: Date;
}