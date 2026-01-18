import { IPortfolio } from './interface.porfolio';
import Portfolio from './model.portfolio';

// Fetch all portfolios by userId
export const getPortfolioByUserId = async (userId: string): Promise<IPortfolio[]> => {
  return Portfolio.find({ userId });
};

// Delete a specific portfolio by ID (not by userId anymore)
export const deletePortfolioById = async (portfolioId: string): Promise<IPortfolio | null> => {
  return Portfolio.findByIdAndDelete(portfolioId);
};


export const createPortfolio = async (
  userId: string,
  data: Partial<IPortfolio>
): Promise<IPortfolio> => {
  const portfolio = new Portfolio({ userId, ...data });
  return await portfolio.save();
};



export const createOrUpdatePortfolio = async (
  userId: string,
  data: Partial<IPortfolio>
): Promise<IPortfolio> => {
  const existing = await Portfolio.findOne({ userId });
  if (existing) {
    Object.assign(existing, data);
    return existing.save();
  }

  const portfolio = new Portfolio({ userId, ...data });
  return portfolio.save();

};

//delete portfolio
export const deletePortfolio = async (userId: string): Promise<IPortfolio | null> => {
  const portfolio = await Portfolio.findOneAndDelete({ userId });

  return portfolio;
} 

export const getPortfolioByProviderId = async (providerId: string): Promise<IPortfolio[]> => {
  return Portfolio.find({ userId: providerId });
};
