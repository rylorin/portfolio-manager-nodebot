export const TradeLink = {
  toIndex: (portfolioId: number | string): string => `/portfolio/${portfolioId}/trades/summary/open/`,
  toItem: (portfolioId: number | string, tradeId: number | string): string =>
    `/portfolio/${portfolioId}/trades/id/${tradeId}/`,
  toClosedYtd: (portfolioId: number | string): string => `/portfolio/${portfolioId}/trades/summary/ytd/`,
  toClosed12m: (portfolioId: number | string): string => `/portfolio/${portfolioId}/trades/summary/12m/`,
  toClosed: (portfolioId: number | string): string => `/portfolio/${portfolioId}/trades/summary/all/`,
  toClosedMonth: (portfolioId: number | string, month: string): string =>
    `/portfolio/${portfolioId}/trades/month/${month.substring(0, 4)}/${month.substring(5)}`,
  toClosedOpened: (portfolioId: number | string, month: string, opened: string): string =>
    `/portfolio/${portfolioId}/trades/closed/${month.substring(0, 4)}/${month.substring(5)}/opened/${opened.substring(0, 4)}/${opened.substring(5)}`,
};
