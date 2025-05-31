import { Request, Response } from 'express';
import * as portfolioService from './service.portfolio';
import { StatusCodes } from 'http-status-codes';

export const getUserPortfolio = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const portfolio = await portfolioService.getPortfolioByUserId(userId);
    if (!portfolio) {
      res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Portfolio not found' });
      return;
    }

    res.status(StatusCodes.OK).json({ success: true, data: portfolio });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error fetching portfolio',
      errorMessages: error.message || String(error),
    });
  }
};

export const createOrUpdatePortfolio = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const data = req.body; 

    const portfolio = await portfolioService.createOrUpdatePortfolio(userId, data);

    res.status(StatusCodes.OK).json({ success: true, data: portfolio });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error saving portfolio',
      errorMessages: error.message || String(error),
    });
  }
};

//delete portfolio
export const deletePortfolio = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const portfolio = await portfolioService.deletePortfolio(userId);

    if (!portfolio) {
      // Portfolio not found or already deleted
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Portfolio not found or already deleted',
      });
      return;
    }

    // Successfully deleted
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Portfolio deleted successfully',
      data: portfolio,
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error deleting portfolio',
      errorMessages: error.message || String(error),
    });
  }
};
 