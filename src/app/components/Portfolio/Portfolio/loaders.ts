import { ContractEntry, PortfolioEntry } from "@/routers";
import { LoaderFunctionArgs } from "react-router-dom";

/**
 * Load portfolio content
 * @param param0
 * @returns
 */
export const portfolioLoader = async ({ params }: LoaderFunctionArgs): Promise<PortfolioEntry> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}`)
    .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((data) => data.portfolio as PortfolioEntry);
};

/**
 * Load portfolio content
 * @param param0
 * @returns
 */
export const portfolioEditLoader = async ({
  params,
}: LoaderFunctionArgs): Promise<{ portfolio: PortfolioEntry; contracts: ContractEntry[] }> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}`)
    .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((data) => data.portfolio as PortfolioEntry)
    .then(async (portfolio) =>
      fetch("/api/repository/stocks/")
        .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
        .then((data) => data.contracts as ContractEntry[])
        .then((contracts) => ({ portfolio, contracts })),
    );
};
