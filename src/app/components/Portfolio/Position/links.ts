export const PositionLink = {
  toItem: (portfolioId, positionId): string =>
    portfolioId && positionId ? `/portfolio/${portfolioId}/positions/id/${positionId}/` : "#",
};