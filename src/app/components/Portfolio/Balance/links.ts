export const BalanceLink = {
  toIndex: (portfolioId: number | string): string => `/portfolio/${portfolioId}/balances/`,
  toItem: (portfolioId: number | string, balanceId: number | string): string =>
    `/portfolio/${portfolioId}/balances/id/${balanceId}/`,
};
