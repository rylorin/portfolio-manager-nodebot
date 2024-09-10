import { LoaderFunctionArgs } from "react-router-dom";
import { BalanceEntry } from "../../../../routers/balances.types";

/**
 * Load all balances
 * @param params
 * @returns
 */
export const balancesIndexLoader = async ({ params }: LoaderFunctionArgs): Promise<BalanceEntry[]> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/balances/index`)
    .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((data) => data.balances as BalanceEntry[]);
};

/**
 * Get one balance
 * @param params
 * @returns
 */
export const balancesShowLoader = async ({ params }: LoaderFunctionArgs): Promise<BalanceEntry> => {
  const { portfolioId, balanceId } = params;
  // console.log("balancesShowLoader", portfolioId, balanceId);
  return fetch(`/api/portfolio/${portfolioId}/balances/id/${balanceId}`)
    .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((data) => data.balance as BalanceEntry);
};
