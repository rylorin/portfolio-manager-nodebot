export const ContractLink = {
  toItem: (portfolioId: number | string, contractId: number | string): string =>
    portfolioId && contractId ? `/portfolio/${portfolioId}/contracts/id/${contractId}/` : "#",
};
