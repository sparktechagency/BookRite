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

    // multer stores files in req.files.image as an array (because you used .fields)
    if (req.files && 'image' in req.files) {
      const imageFiles = (req.files as { [fieldname: string]: Express.Multer.File[] }).image;
      data.image = data.image || [];

      imageFiles.forEach(file => {
        const imageUrl = `/uploads/images/${file.filename}`;
        data.image.push(imageUrl);
      });
    }

    // Validate required fields
    if (!data.name || !data.description) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Name and description are required."
      });
      return;
    }

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

//get portfolio by providerId
export const getPortfolioByProviderId = async (req: Request, res: Response): Promise<void> => { 
  try {
    const providerId = req.params.userId;
    if (!providerId) {
      res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Provider ID is required' });
      return;
    }

    const portfolio = await portfolioService.getPortfolioByProviderId(providerId);
    if (!portfolio) {
      res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Portfolio not found for this provider' });
      return;
    }

    res.status(StatusCodes.OK).json({ success: true, data: portfolio });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error fetching portfolio by provider ID',
      errorMessages: error.message || String(error),
    });
  }
}
 