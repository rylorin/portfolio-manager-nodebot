import {
  OptionPositionEntry,
  PositionEntry,
  StatementEntry,
  StatementUnderlyingEntry,
  StatementUnderlyingOption,
} from ".";
import { TradeStatus, TradeStrategy } from "../models/types";

export interface VirtualPositionEntry {
  id: number;
  openDate: number;
  quantity: number;
  contract: StatementUnderlyingEntry | StatementUnderlyingOption;
  trade_id: number | undefined;
  price: number | null; // current unit price
  value: number | undefined;
  pru: number;
  cost: number;
  pnl: number | undefined;
}

/**
 * Trade entry data transfered between frontend and backend
 */
export interface TradeEntry {
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
}

export interface TradeMonthlySynthesysEntry {
  count: number;
  success: number;
  duration: number;
  min: number;
  max: number;
  total: number;
}
export type TradeMonthlyRow = Record<"string", TradeMonthlySynthesysEntry>;
export type TradeMonthlySynthesys = Record<"string", TradeMonthlyRow>;
export interface TradeSynthesys {
  open: TradeEntry[];
  byMonth: TradeMonthlySynthesys;
}
export interface OpenTradesWithPositions {
  trades: TradeEntry[];
  positions: (PositionEntry | OptionPositionEntry)[];
}
