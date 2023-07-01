import { StatementTypes } from "../models";

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
