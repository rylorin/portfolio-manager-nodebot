import { LoaderFunctionArgs } from "react-router-dom";
import { Portfolio as PortfolioModel } from "../../../../models/portfolio.model";

/**
 * Load portfolio content
 * @param param0
 * @returns
 */
export const portfolioLoader = async ({ params }: LoaderFunctionArgs): Promise<PortfolioModel> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}`)
    .then(async (response) => response.json())
    .then((data) => data.portfolio as PortfolioModel);
};
