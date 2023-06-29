import { SecType } from "@stoqey/ib";
import { StatementTypes } from "../models";
import { TradeStatus, TradeStrategy } from "../models/types";

export type SynthesysEntry = { stocks: number; options: number; dividends: number; interests: number; total: number };
export type StatementsSynthesysEntries = Record<"string", SynthesysEntry>;

export type StatementEntry = {
  id: number;
  date: number;
  type: StatementTypes;
  currency: string;
  amount: number;
  pnl: number | undefined;
  fees: number | undefined;
  fxRateToBase: number;
  description: string;
  trade_id: number | undefined;
  underlying: { id: number; symbol: string } | undefined;
};

export type PositionEntry = {
  id: number;
  quantity: number;
  contract: {
    id: number;
    secType: SecType;
    symbol: string;
    name: string;
    multiplier: number;
    currency: string;
    price: number;
  };
  trade_id: number;
  price: number;
  value: number;
  pru: number;
  cost: number;
  pnl: number;
  baseRate: number;
};

export type OptionPositionEntry = PositionEntry & {
  option: {
    id: number;
    symbol: string;
    expiration: string;
    strike: number;
    type: string;
    delta: number;
  };
  stock: {
    id: number;
    symbol: string;
    price: number;
  };
  engaged: number;
  risk: number;
  apy: number | undefined;
};

export type BalanceEntry = {
  id: number;
  quantity: number;
  currency: string;
  baseRate: number;
};

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
  // fxRateToBase: number;
  statements: StatementEntry[] | undefined;
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
