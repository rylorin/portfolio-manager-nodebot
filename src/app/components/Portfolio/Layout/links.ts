import { BalanceLink } from "../Balance/links";
import { StatementLink } from "../Statement/links";
import { TradeLink } from "../Trade/links";

export const links = (portfolioId: string): Record<string, string> => {
  const result: Record<string, string> = {};
  result[StatementLink.toIndex(portfolioId)] = "Statements";
  result[TradeLink.toIndex(portfolioId)] = "Trades";
  result[`/portfolio/${portfolioId}/positions/all`] = "Positions";
  result[`/portfolio/${portfolioId}/orders`] = "Open Orders";
  result[BalanceLink.toIndex(portfolioId)] = "Balances";
  result[`/portfolio/${portfolioId}/symbols`] = "Symbols";
  result[`/portfolio/${portfolioId}/reports`] = "Tax reports";
  result[`/portfolio/${portfolioId}/parameters`] = "Settings";
  return result;
};
