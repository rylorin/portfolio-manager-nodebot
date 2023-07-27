export const PositionLink = {
  toItem: (portfolioId: number | string, positionId: number | string): string =>
    portfolioId && positionId ? `/portfolio/${portfolioId}/positions/id/${positionId}/` : "#",
  editItem: (portfolioId: number | string, positionId: number | string): string =>
    portfolioId && positionId ? `/portfolio/${portfolioId}/positions/id/${positionId}/edit` : "#",
};
