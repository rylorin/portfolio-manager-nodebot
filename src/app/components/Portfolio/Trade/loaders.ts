import { LoaderFunctionArgs } from "react-router-dom";
import { OpenTradesWithPositions, TradeEntry, TradeSynthesys } from "../../../../routers/trades.types";

/**
 * Load year to date trades summary
 * @param param0
 * @returns
 */
export const tradeSummaryLoaderYTD = ({ params }: LoaderFunctionArgs): Promise<TradeSynthesys> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/trades/summary/ytd`)
    .then((response) => response.json())
    .then((data) => data.tradessynthesys as TradeSynthesys);
};

/**
 * Load last 12 months trades summary
 * @param param0
 * @returns
 */
export const tradeSummaryLoader12M = ({ params }: LoaderFunctionArgs): Promise<TradeSynthesys> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/trades/summary/12m`)
    .then((response) => response.json())
    .then((data) => data.tradessynthesys as TradeSynthesys);
};

/**
 * Load all trades summary
 * @param param0
 * @returns
 */
export const tradeSummaryLoaderAll = ({ params }: LoaderFunctionArgs): Promise<TradeSynthesys> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/trades/summary/all`)
    .then((response) => response.json())
    .then((data) => data.tradessynthesys as TradeSynthesys);
};

/**
 * Get open trades
 * @param param
 * @returns
 */
export const tradesOpenLoader = ({ params }: LoaderFunctionArgs): Promise<OpenTradesWithPositions> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/trades/summary/open`)
    .then((response) => response.json())
    .then((data) => data.tradessynthesys as OpenTradesWithPositions);
};

/**
 * Get one trade
 * @param params
 * @returns
 */
export const tradesShowLoader = ({ params }: LoaderFunctionArgs): Promise<TradeEntry> => {
  const { portfolioId, tradeId } = params;
  // console.log("tradesShowLoader", portfolioId, tradeId);
  return fetch(`/api/portfolio/${portfolioId}/trades/id/${tradeId}`)
    .then((response) => response.json())
    .then((data) => data.trade as TradeEntry);
};

/**
 * Load statement list content
 * @param param0
 * @returns
 */
export const tradesMonthLoader = ({ params }: LoaderFunctionArgs): Promise<TradeEntry[]> => {
  const { portfolioId, year, month } = params;
  return fetch(`/api/portfolio/${portfolioId}/trades/month/${year}/${month}`)
    .then((response) => response.json())
    .then((data) => data.trades as TradeEntry[]);
};
