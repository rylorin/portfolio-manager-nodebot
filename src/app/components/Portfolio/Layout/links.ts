import { StatementLink } from "../Statement/links";
import { TradeLink } from "../Trade/links";

export const links = (portfolioId: string): Record<string, string> => {
  const result: Record<string, string> = {};
  result[StatementLink.toIndex(portfolioId)] = "Statements";
  result[`/portfolio/${portfolioId}/orders`] = "Open Orders";
  result[`/portfolio/${portfolioId}/positions/all`] = "Positions";
  result[`/portfolio/${portfolioId}/balances`] = "Balances";
  result[TradeLink.toIndex(portfolioId)] = "Trades";
  result[`/portfolio/${portfolioId}/symbols`] = "Symbols";
  result[`/portfolio/${portfolioId}/parameters`] = "Parameters";
  return result;
};