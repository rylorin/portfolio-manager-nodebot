export const TradeLink = {
  toIndex: (portfolioId): string => `/portfolio/${portfolioId}/trades/`,
  toItem: (portfolioId, tradeId): string => `/portfolio/${portfolioId}/trades/id/${tradeId}/`,
};
