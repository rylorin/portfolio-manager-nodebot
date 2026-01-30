export const StatementLink = {
  toIndex: (portfolioId: number | string): string => `/portfolio/${portfolioId}/statements/summary/12m/`,
  toItem: (portfolioId: number | string, statementId: number | string): string =>
    `/portfolio/${portfolioId}/statements/id/${statementId}/`,
  toDate: (portfolioId: number | string, date: Date | string): string => {
    if (typeof date != "string") date = date.toISOString();
    return `/portfolio/${portfolioId}/statements/month/${date.substring(0, 4)}/${date.substring(5, 7)}/`;
  },
  toMonth: (portfolioId: number | string, year: number | string, month: number | string): string => {
    return `/portfolio/${portfolioId}/statements/month/${year}/${month}/`;
  },
  edit: (portfolioId: number | string, itemId: number | string): string =>
    `/portfolio/${portfolioId}/statements/id/${itemId}/edit`,
};
