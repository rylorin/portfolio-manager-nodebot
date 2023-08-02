import { TradeStatus, TradeStrategy } from "../models";
import { OptionPositionEntry, PositionEntry } from "./positions.types";
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
  status: TradeStatus;
  openingDate: number; // Date in msecs
  closingDate: number | undefined; // Date in msecs
  duration: number;
  expectedExpiry: string | undefined; // YYYY-MM-DD
  expectedDuration: number | undefined;
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

export type TradeSynthesys = { open: TradeEntry[]; byMonth: TradeMonthlySynthesys };
export type OpenTradesWithPositions = { trades: TradeEntry[]; positions: (PositionEntry | OptionPositionEntry)[] };
