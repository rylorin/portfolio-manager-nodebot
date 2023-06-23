export const links = (portfolioId: string): Record<string, string> => {
  const result: Record<string, string> = {};
  result[`/portfolio/${portfolioId}/statements/summary/ytd`] = "Statements";
  result[`/portfolio/${portfolioId}/orders`] = "Open Orders";
  result[`/portfolio/${portfolioId}/positions/all`] = "Positions";
  result[`/portfolio/${portfolioId}/balances`] = "Balances";
  result[`/portfolio/${portfolioId}/trades/summary/ytd`] = "Trades";
  result[`/portfolio/${portfolioId}/symbols`] = "Symbols";
  result[`/portfolio/${portfolioId}/parameters`] = "Parameters";
  return result;
};
