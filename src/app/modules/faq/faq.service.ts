import FAQ, { IFAQ } from './faq.model';

export const createFAQ = async (questions: string, answers: string): Promise<IFAQ> => {
  if (!questions.length || !answers.length) throw new Error('Questions and answers cannot be empty arrays.');

  // Optional: you could check uniqueness differently now, skipping here
  const faq = new FAQ({ questions, answers });
  return faq.save();
};

export const getAllFAQs = async (): Promise<IFAQ[]> => {
  return FAQ.find().sort({ createdAt: -1 });
};

export const updateFAQ = async (
  id: string,
  questions?: string,
  answers?: string
): Promise<IFAQ | null> => {
  const updateData: Partial<IFAQ> = {};
  if (questions) updateData.questions = questions;
  if (answers) updateData.answers = answers;

  const updatedFAQ = await FAQ.findByIdAndUpdate(id, updateData, { new: true });
  if (!updatedFAQ) throw new Error('FAQ not found');
  return updatedFAQ;
};

export const deleteFAQ = async (id: string): Promise<void> => {
  const deleted = await FAQ.findByIdAndDelete(id);
  if (!deleted) throw new Error('FAQ not found');
};
