import { StatementsSynthesysEntries } from "../../../../routers/statements.types";
import { TradeEntry } from "../../../../routers/trades.types";

/**
 * Load year to date statements summary
 * @param param0
 * @returns
 */
export const tradeSummaryLoaderYTD = ({ params }): Promise<StatementsSynthesysEntries> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/trades/summary/ytd`)
    .then((response) => response.json())
    .then((data) => data.tradessynthesys);
};

/**
 * Load last 12 months statements summary
 * @param param0
 * @returns
 */
export const tradeSummaryLoader12M = ({ params }): Promise<StatementsSynthesysEntries> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/trades/summary/12m`)
    .then((response) => response.json())
    .then((data) => data.tradessynthesys);
};

/**
 * Load all statements summary
 * @param param0
 * @returns
 */
export const tradeSummaryLoaderAll = ({ params }): Promise<StatementsSynthesysEntries> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/trades/summary/all`)
    .then((response) => response.json())
    .then((data) => data.tradessynthesys);
};

/**
 * Load statement list content
 * @param param0
 * @returns
 */
export const tradesShowLoader = ({ params }): Promise<TradeEntry> => {
  const { portfolioId, tradeId } = params;
  // console.log("tradesShowLoader", portfolioId, tradeId);
  return fetch(`/api/portfolio/${portfolioId}/trades/id/${tradeId}`)
    .then((response) => response.json())
    .then((data) => data.trade);
};

/**
 * Load statement list content
 * @param param0
 * @returns
 */
export const tradesMonthLoader = ({ params }): Promise<TradeEntry[]> => {
  const { portfolioId, year, month } = params;
  return fetch(`/api/portfolio/${portfolioId}/trades/month/${year}/${month}`)
    .then((response) => response.json())
    .then((data) => data.statemententries);
};
