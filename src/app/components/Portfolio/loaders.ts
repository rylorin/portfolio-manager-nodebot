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
    .then((data) => data.portfolios as PortfolioModel[]);
};
