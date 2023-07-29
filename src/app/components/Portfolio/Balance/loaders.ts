import { LoaderFunctionArgs } from "react-router-dom";
import { Balance } from "../../../../models";

/**
 * Load all balances
 * @param params
 * @returns
 */
export const balancesIndexLoader = ({ params }: LoaderFunctionArgs): Promise<Balance[]> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/balances/index`)
    .then((response) => response.json())
    .then((data) => data.balances as Balance[]);
};
