import { Request, Response } from 'express';
import * as portfolioService from './service.portfolio';
import { createPortfolio } from './service.portfolio';
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
export const getUserPortfolios = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
      return;
    }

    const portfolios = await portfolioService.getPortfoliosByUserId(userId);

    res.status(StatusCodes.OK).json({
      success: true,
      data: portfolios,
      message: portfolios.length > 0 
        ? 'Portfolios fetched successfully' 
        : 'No portfolios found for this user'
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error fetching portfolios',
      errorMessages: error.message || String(error),
    });
  }
};


export const createPortfolioController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
      return;
    }

    const data = req.body;

    // Handle file uploads
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

    // DO NOT check for existing portfolios by userId - allow multiple portfolios
    // Only check for duplicate names if you want unique names per user (optional)
    /*
    const existingPortfolio = await Portfolio.findOne({ 
      userId, 
      name: data.name.trim() 
    });
    if (existingPortfolio) {
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: "You already have a portfolio with this name."
      });
      return;
    }
    */

    const portfolio = await createPortfolio(userId, data);
    
    res.status(StatusCodes.CREATED).json({ 
      success: true, 
      data: portfolio,
      message: 'Portfolio created successfully'
    });
  } catch (error: any) {
    console.error('Portfolio creation error:', error);
    
    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0];
      let message = 'Duplicate entry detected.';
      
      if (duplicateField === 'userId') {
        message = 'Database configuration error. Please contact support.';
      } else if (duplicateField === 'name') {
        message = 'A portfolio with this name already exists.';
      }
      
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: message,
      });
      return;
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error creating portfolio',
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
 