export const ReportLink = {
  toIndex: (portfolioId: number | string): string => (portfolioId ? `/portfolio/${portfolioId}/reports/` : "#"),
  toItem: (portfolioId: number | string, year: number | string): string =>
    portfolioId && year ? `/portfolio/${portfolioId}/reports/year/${year}/` : "#",
};
