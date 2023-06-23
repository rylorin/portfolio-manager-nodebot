import { Portfolio as PortfolioModel } from "../../../models/portfolio.model";

/**
 * Load portfolio list content
 * @param param0
 * @returns
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const portfolioIndexLoader = ({ params }): Promise<PortfolioModel[]> => {
  return fetch("/api/portfolio")
    .then((response) => response.json())
    .then((data) => data.portfolios);
};

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
