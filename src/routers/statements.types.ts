import { ContractEntry, OptionContractEntry } from "./";

export interface SynthesysEntry {
  stocks: number;
  options: number;
  dividends: number;
  interests: number;
  total: number;
}
export type StatementsSynthesysEntries = Record<"string", SynthesysEntry>;

export type StatementUnderlyingEntry = ContractEntry;

export type StatementUnderlyingOption = ContractEntry & OptionContractEntry;

// `type` required instead of `interface` otherwise `Formik` complains about `JsonObject` incompatibility
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type BaseStatement = {
  id: number;
  transactionId: number;
  date: number;
  currency: string;
  fxRateToBase: number;
  amount: number;
  underlying: StatementUnderlyingEntry | undefined;
  trade_id: number | null;
  description: string;
};

export type EquityStatementEntry = BaseStatement & {
  statementType: "Trade";
  // underlying: StatementUnderlyingEntry;
  quantity: number;
  pnl: number;
  fees: number;
};

export type OptionStatementEntry = BaseStatement & {
  statementType: "TradeOption";
  option: StatementUnderlyingOption;
  quantity: number;
  pnl: number;
  fees: number;
};

export type BondStatementEntry = BaseStatement & {
  statementType: "Bond";
  country: string;
  // underlying: StatementUnderlyingEntry | undefined;
  quantity: number;
  pnl: number;
  fees: number;
};

export type DividendStatementEntry = BaseStatement & {
  statementType: "Dividend";
  country: string;
  // underlying: StatementUnderlyingEntry | undefined;
};

export type TaxStatementEntry = BaseStatement & { statementType: "Tax"; country: string };

export type InterestStatementEntry = BaseStatement & {
  statementType: "Interest";
  country: string | null;
  // underlying: StatementUnderlyingEntry | undefined;
};
export type WithHoldingStatementEntry = BaseStatement & { statementType: "WithHolding" };

export type FeeStatementEntry = BaseStatement & { statementType: "OtherFee" };

export type CorporateStatementEntry = BaseStatement & {
  statementType: "CorporateStatement";
  // underlying: StatementUnderlyingEntry;
  quantity: number;
  pnl: number;
};

export type CashStatementEntry = BaseStatement & { statementType: "Cash" };

export type SalesTaxStatementEntry = BaseStatement & { statementType: "SalesTax" };

export type PriceAjustmentsStatementEntry = BaseStatement & { statementType: "PriceAdjustments" };

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
  | BondStatementEntry
  | SalesTaxStatementEntry
  | PriceAjustmentsStatementEntry;
