export const ReportLink = {
  toIndex: (portfolioId: number | string): string => (portfolioId ? `/portfolio/${portfolioId}/reports/ytd` : "#"),
  toSummary: (portfolioId: number | string, year: number | string): string =>
    portfolioId && year ? `/portfolio/${portfolioId}/reports/year/${year}/` : "#",
  toDetails: (portfolioId: number | string, year: number | string): string =>
    portfolioId && year ? `/portfolio/${portfolioId}/reports/year/${year}/details` : "#",
};
