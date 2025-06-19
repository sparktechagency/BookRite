import { IPortfolio } from './interface.porfolio';
import Portfolio from './model.portfolio';

export const getPortfolioByUserId = async (userId: string): Promise<IPortfolio | null> => {
  return Portfolio.findOne({ userId });
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

//get portfolio by providerId
export const getPortfolioByProviderId = async (providerId: string): Promise<IPortfolio | null> => {
  return Portfolio.findOne({ userId: providerId});
};
