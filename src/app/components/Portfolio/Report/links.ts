export const ReportLink = {
  toIndex: (portfolioId: number | string): string => (portfolioId ? `/portfolio/${portfolioId}/reports/ytd` : "#"),
  toYtd: (portfolioId: number | string): string => (portfolioId ? `/portfolio/${portfolioId}/reports/ytd` : "#"),
  to12m: (portfolioId: number | string): string => (portfolioId ? `/portfolio/${portfolioId}/reports/12m` : "#"),
  toAll: (portfolioId: number | string): string => (portfolioId ? `/portfolio/${portfolioId}/reports/index` : "#"),
  toSummary: (portfolioId: number | string, year: number | string): string =>
    portfolioId && year ? `/portfolio/${portfolioId}/reports/year/${year}/` : "#",
  toDetails: (portfolioId: number | string, year: number | string): string =>
    portfolioId && year ? `/portfolio/${portfolioId}/reports/year/${year}/details` : "#",
};
