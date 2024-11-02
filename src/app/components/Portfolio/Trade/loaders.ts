import { LoaderFunctionArgs } from "react-router-dom";
import { TradeEntry, TradeSynthesys } from "../../../../routers/trades.types";

/**
 * Load year to date trades summary
 * @param param0
 * @returns
 */
export const tradeSummaryLoaderYTD = async ({ params }: LoaderFunctionArgs): Promise<TradeSynthesys> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/trades/summary/ytd`)
    .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((data) => data.tradessynthesys as TradeSynthesys);
};

/**
 * Load last 12 months trades summary
 * @param param0
 * @returns
 */
export const tradeSummaryLoader12M = async ({ params }: LoaderFunctionArgs): Promise<TradeSynthesys> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/trades/summary/12m`)
    .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((data) => data.tradessynthesys as TradeSynthesys);
};

/**
 * Load all trades summary
 * @param param0
 * @returns
 */
export const tradeSummaryLoaderAll = async ({ params }: LoaderFunctionArgs): Promise<TradeSynthesys> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/trades/summary/all`)
    .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((data) => data.tradessynthesys as TradeSynthesys);
};

/**
 * Get open trades
 * @param param
 * @returns
 */
export const tradesOpenLoader = async ({ params }: LoaderFunctionArgs): Promise<TradeEntry[]> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/trades/summary/open`)
    .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((data) => data.trades as TradeEntry[]);
};

/**
 * Get one trade
 * @param params
 * @returns
 */
export const tradesShowLoader = async ({ params }: LoaderFunctionArgs): Promise<TradeEntry> => {
  const { portfolioId, tradeId } = params;
  // console.log("tradesShowLoader", portfolioId, tradeId);
  return fetch(`/api/portfolio/${portfolioId}/trades/id/${tradeId}`)
    .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((data) => data.trade as TradeEntry);
};

/**
 * Load trades closed on a given month
 * @param param0
 * @returns
 */
export const tradesMonthLoader = async ({ params }: LoaderFunctionArgs): Promise<TradeEntry[]> => {
  const { portfolioId, year, month } = params;
  return fetch(`/api/portfolio/${portfolioId}/trades/month/${year}/${month}`)
    .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((data) => data.trades as TradeEntry[]);
};

/**
 * Load trades closed on a given month
 * @param param0
 * @returns
 */
export const tradesClosedOpenedLoader = async ({ params }: LoaderFunctionArgs): Promise<TradeEntry[]> => {
  const { portfolioId, year, month, yearfrom, monthfrom } = params;
  return fetch(`/api/portfolio/${portfolioId}/trades/closed/${year}/${month}/opened/${yearfrom}/${monthfrom}`)
    .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((data) => data.trades as TradeEntry[]);
};
