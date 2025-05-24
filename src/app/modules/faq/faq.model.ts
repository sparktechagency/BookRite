import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IFAQ extends Document {
  questions: string;  
  answers: string;  
  createdAt: Date;
  updatedAt: Date;
}

const faqSchema = new Schema<IFAQ>(
  {
    questions: {
      type: String,
      required: true,
    },
    answers: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const FAQ: Model<IFAQ> = mongoose.model<IFAQ>('FAQ', faqSchema);

export default FAQ;
