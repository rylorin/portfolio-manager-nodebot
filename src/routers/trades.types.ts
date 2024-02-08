import { TradeStatus, TradeStrategy } from "../models";
import { OptionPositionEntry, PositionEntry } from "./positions.types";
import { StatementEntry, StatementOptionEntry, StatementUnderlyingEntry } from "./statements.types";

export type VirtualPositionEntry = {
  id: number;
  openDate: number;
  quantity: number;
  contract: StatementUnderlyingEntry | StatementOptionEntry;
  trade_id: number | undefined;
  price: number | null; // current unit price
  value: number | undefined;
  pru: number;
  cost: number;
  pnl: number | undefined;
};

/**
 * Trade entry data transfered between frontend and backend
 */
export type TradeEntry = {
  /** unique trade id */
  id: number;
  portfolioId: number;
  underlying: StatementUnderlyingEntry;
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
  unrlzdPnl: number | undefined;
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
