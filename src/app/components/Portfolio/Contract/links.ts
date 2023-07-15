export const ContractLink = {
  toItem: (portfolioId, contractId): string =>
    portfolioId && contractId ? `/portfolio/${portfolioId}/contracts/id/${contractId}/` : "#",
};
