import { Portfolio as PortfolioModel } from "../../../models/portfolio.model";

/**
 * Load portfolio content
 * @param param0
 * @returns
 */
export const portfolioLoader = ({ params }): Promise<PortfolioModel> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}`)
    .then((response) => response.json())
    .then((data) => data.portfolio);
};
