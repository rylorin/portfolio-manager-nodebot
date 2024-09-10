import { LoaderFunction, LoaderFunctionArgs } from "react-router-dom";
import { Portfolio as PortfolioModel } from "../../../models/portfolio.model";

/**
 * Load portfolio list content
 * @param params
 * @returns
 */

export const portfolioIndexLoader: LoaderFunction = async ({
  params,
}: LoaderFunctionArgs): Promise<PortfolioModel[]> => {
  const { portfolioId } = params; // eslint-disable-line @typescript-eslint/no-unused-vars
  return fetch("/api/portfolio")
    .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((data) => data.portfolios as PortfolioModel[]);
};
