import { LoaderFunction, LoaderFunctionArgs } from "react-router-dom";
import { Portfolio as PortfolioModel } from "../../../models/portfolio.model";

/**
 * Load portfolio list content
 * @param params
 * @returns
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const portfolioIndexLoader: LoaderFunction = ({ params }: LoaderFunctionArgs): Promise<PortfolioModel[]> => {
  return fetch("/api/portfolio")
    .then((response) => response.json())
    .then((data) => data.portfolios as PortfolioModel[]);
};
