import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IFAQ extends Document {
  questions: string[];  // array of questions
  answers: string[];    // array of answers
  createdAt: Date;
  updatedAt: Date;
}

const faqSchema = new Schema<IFAQ>(
  {
    questions: {
      type: [String],
      required: true,
      validate: [(val: string[]) => val.length > 0, 'At least one question is required']
    },
    answers: {
      type: [String],
      required: true,
      validate: [(val: string[]) => val.length > 0, 'At least one answer is required']
    },
  },
  { timestamps: true }
);

const FAQ: Model<IFAQ> = mongoose.model<IFAQ>('FAQ', faqSchema);

export default FAQ;
