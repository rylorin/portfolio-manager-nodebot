import { Trade } from "@/models";
import { Attributes } from "sequelize";
import {
  ContractEntry,
  OptionPositionEntry,
  PositionEntry,
  StatementEntry,
  StatementUnderlyingEntry,
  StatementUnderlyingOption,
} from ".";
import { TradeStatus, TradeStrategy } from "../models/types";

// `type` required instead of `interface` otherwise `Formik` complains about `JsonObject` incompatibility
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type VirtualPositionEntry = {
  id: number;
  openDate: number;
  quantity: number;
  contract: StatementUnderlyingEntry | StatementUnderlyingOption;
  trade_unit_id: number | undefined;
  price: number | null; // current unit price
  value: number | undefined;
  pru: number;
  cost: number;
  pnl: number | undefined;

  portfolio_id: number;
  contract_id: number;
};

/**
 * Trade entry data transfered between frontend and backend
 */
export interface TradeEntry0 {
  /** unique trade id */
  id: number;
  portfolio_id: number;
  underlying: StatementUnderlyingEntry;
  status: TradeStatus;
  openingDate: number; // Date in msecs
  closingDate: number | undefined; // Date in msecs
  expectedExpiry: string | undefined; // YYYY-MM-DD
  strategy: TradeStrategy;
  PnL: number | undefined;
  pnlInBase: number | undefined;
  currency: string;
  risk: number | undefined;
  comment: string | undefined;

  statements: StatementEntry[] | undefined;
  positions: PositionEntry[] | undefined;

  // Fileds added by router
  duration: number;
  expectedDuration: number | undefined;
  unrlzdPnl: number | undefined;
  apy: number | undefined;
  virtuals: VirtualPositionEntry[] | undefined;
}

export type TradeEntry = Omit<
  Attributes<Trade>,
  "portfolio" | "underlying" | "openingDate" | "closingDate" | "statements" | "positions" | "createdAt" | "updatedAt"
> & {
  underlying: ContractEntry;
  openingDate: number; // Date in msecs
  closingDate: number | undefined; // Date in msecs

  statements: StatementEntry[] | undefined;
  positions: PositionEntry[] | undefined;

  // Fileds added by router
  duration: number;
  expectedDuration: number | undefined;
  unrlzdPnl: number | undefined;
  apy: number | undefined;
  virtuals: VirtualPositionEntry[] | undefined;
};

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
