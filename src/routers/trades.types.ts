import { TradeStatus, TradeStrategy } from "../models";
import { PositionEntry } from "./positions.types";
import { StatementEntry } from "./statements.types";

export type TradeEntry = {
  id: number;
  symbol_id: number;
  symbol: string;
  currency: string;
  openingDate: number;
  closingDate: number | undefined;
  status: TradeStatus;
  duration: number;
  strategy: TradeStrategy;
  strategyLabel: string;
  risk: number | undefined;
  pnl: number | undefined;
  apy: number | undefined;
  comment: string | undefined;
  statements: StatementEntry[] | undefined;
  positions: PositionEntry[] | undefined;
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
