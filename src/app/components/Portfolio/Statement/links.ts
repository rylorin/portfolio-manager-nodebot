export const StatementLink = {
  toIndex: (portfolioId: number | string): string => `/portfolio/${portfolioId}/statements/summary/ytd/`,
  toItem: (portfolioId: number | string, statementId: number | string): string =>
    `/portfolio/${portfolioId}/statements/id/${statementId}/`,
};
