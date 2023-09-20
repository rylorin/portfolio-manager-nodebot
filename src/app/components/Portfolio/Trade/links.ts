export const TradeLink = {
  toIndex: (portfolioId: number | string): string => `/portfolio/${portfolioId}/trades/summary/open/`,
  toItem: (portfolioId: number | string, tradeId: number | string): string =>
    `/portfolio/${portfolioId}/trades/id/${tradeId}/#top`,
};
