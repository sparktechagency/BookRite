import { Request, Response } from 'express';
import * as faqService from './faq.service';
import { StatusCodes } from 'http-status-codes';

export const addFAQ = async (req: Request, res: Response): Promise<void> => {
  try {
    const { questions, answers } = req.body;
    const faq = await faqService.createFAQ(questions, answers);
    res.status(StatusCodes.CREATED).json({ success: true, data: faq });
  } catch (error: any) {
    res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: error.message || 'Error creating FAQ' });
  }
};

export const listFAQs = async (req: Request, res: Response): Promise<void> => {
  try {
    const faqs = await faqService.getAllFAQs();
    res.status(StatusCodes.OK).json({ success: true, data: faqs });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message || 'Error fetching FAQs' });
  }
};

export const updateFAQ = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { questions, answers } = req.body;

    const updatedFAQ = await faqService.updateFAQ(id, questions, answers);
    res.status(StatusCodes.OK).json({ success: true, data: updatedFAQ });
  } catch (error: any) {
    res.status(StatusCodes.NOT_FOUND).json({ success: false, message: error.message || 'FAQ not found' });
  }
};

export const deleteFAQ = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await faqService.deleteFAQ(id);
    res.status(StatusCodes.OK).json({ success: true, message: 'FAQ deleted successfully' });
  } catch (error: any) {
    res.status(StatusCodes.NOT_FOUND).json({ success: false, message: error.message || 'FAQ not found' });
  }
};
