import { OptionType } from "@stoqey/ib";
import { StatementTypes } from "../models/statement.types";

export type SynthesysEntry = { stocks: number; options: number; dividends: number; interests: number; total: number };
export type StatementsSynthesysEntries = Record<"string", SynthesysEntry>;

export type StatementOptionEntry = {
  id: number;
  symbol: string;
  expiry: number;
  strike: number;
  callOrPut: OptionType;
  multiplier: number;
};

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
  trade_id: number | null;
  underlying: { id: number; symbol: string } | undefined;
  quantity: number | undefined;
  option: StatementOptionEntry | undefined;
};
