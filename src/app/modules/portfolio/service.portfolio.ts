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
