import { OptionType } from "@stoqey/ib";
import { ContractType } from "../models/contract.types";

export type SynthesysEntry = { stocks: number; options: number; dividends: number; interests: number; total: number };
export type StatementsSynthesysEntries = Record<"string", SynthesysEntry>;

export type StatementUnderlyingEntry = {
  id: number;
  secType: ContractType;
  symbol: string;
  currency: string;
  name: string;
  price: number | null;
};

export type StatementOptionEntry = StatementUnderlyingEntry & {
  lastTradeDate: string;
  strike: number;
  callOrPut: OptionType;
  multiplier: number;
};

export type BaseStatement = {
  id: number;
  transactionId: number;
  date: number;
  currency: string;
  amount: number;
  pnl: number | undefined;
  fees: number | undefined;
  fxRateToBase: number;
  description: string;
  trade_id: number | null;
  quantity: number | undefined;

  underlying: StatementUnderlyingEntry | undefined;
};

export type EquityStatementEntry = BaseStatement & {
  statementType: "Trade";
};
export type OptionStatementEntry = BaseStatement & {
  statementType: "TradeOption";
  option: StatementOptionEntry;
};
export type DividendStatementEntry = BaseStatement & {
  statementType: "Dividend";
  country: string;
};
export type TaxStatementEntry = BaseStatement & { statementType: "Tax" };
export type InterestStatementEntry = BaseStatement & { statementType: "Interest" };
export type WithHoldingStatementEntry = BaseStatement & { statementType: "WithHolding" };
export type FeeStatementEntry = BaseStatement & { statementType: "OtherFee" };
export type CorporateStatementEntry = BaseStatement & { statementType: "CorporateStatement" };
export type CashStatementEntry = BaseStatement & { statementType: "Cash" };
export type BondStatementEntry = BaseStatement & { statementType: "Bond" };
export type StatementEntry =
  | EquityStatementEntry
  | OptionStatementEntry
  | DividendStatementEntry
  | TaxStatementEntry
  | InterestStatementEntry
  | WithHoldingStatementEntry
  | FeeStatementEntry
  | CorporateStatementEntry
  | CashStatementEntry
  | BondStatementEntry;
