import { TradeStatus, TradeStrategy } from "../models";
import { PositionEntry } from "./positions.types";
import { StatementEntry } from "./statements.types";

export type VirtualPositionEntry = {
  contract_id: number;
  symbol: string;
  quantity: number;
};

/**
 * Trade entry data transfered between frontend and backend
 */
export type TradeEntry = {
  /** unique trade id */
  id: number;
  underlying: {
    symbol_id: number;
    symbol: string;
  };
  currency: string;
  openingDate: number;
  closingDate: number | undefined;
  status: TradeStatus;
  duration: number;
  strategy: TradeStrategy;
  risk: number | undefined;
  pnl: number | undefined;
  pnlInBase: number | undefined;
  apy: number | undefined;
  comment: string | undefined;
  statements: StatementEntry[] | undefined;
  positions: PositionEntry[] | undefined;
  virtuals: VirtualPositionEntry[] | undefined;
};

export type TradeMonthlySynthesysEntry = {
  count: number;
  success: number;
  duration: number;
  min: number;
  max: number;
  total: number;
};
export type TradeMonthlySynthesys = Record<"string", TradeMonthlySynthesysEntry>;

// export type TradeTypeSynthesysEntry = {};
// export type TradeTypeSynthesys = TradeTypeSynthesysEntry[];
export type TradeSynthesys = { open: TradeEntry[]; byMonth: TradeMonthlySynthesys };
