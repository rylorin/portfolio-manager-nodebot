import {
  BondStatementEntry,
  DividendStatementEntry,
  EquityStatementEntry,
  FeeStatementEntry,
  InterestStatementEntry,
  OptionStatementEntry,
  StatementEntry,
  TaxStatementEntry,
  WithHoldingStatementEntry,
} from "./statements.types";

/**
 * Dididend Summary entry data transfered between frontend and backend
 */
export type DididendSummary = {
  country: string;
  grossAmountInBase: number;
  taxes: number;
  netAmountInBase: number;
};

/**
 * Interest Summary entry data transfered between frontend and backend
 */
export type InterestsSummary = {
  country: string;
  grossCredit: number;
  netDebit: number;
  withHolding: number;
  netTotal: number;
};

/**
 * Fees summary
 */
export type FeesSummary = {
  totalAmountInBase: number;
};

/**
 * Trades summary
 */
export type TradesSummary = {
  stocksPnLInBase: number;
  optionsPnLInBase: number;
  bondPnLInBase: number;
  totalPnL: number;
};

/**
 * Report entry data transfered between frontend and backend
 */
export type ReportEntry = {
  // portfolioId: number;
  year: number;
  month: number;
  dividendsSummary: DididendSummary[];
  dividendsDetails: (DividendStatementEntry | TaxStatementEntry)[];
  interestsSummary: InterestsSummary[];
  interestsDetails: (InterestStatementEntry | WithHoldingStatementEntry)[];
  feesSummary: FeesSummary;
  feesDetails: FeeStatementEntry[];
  tradesSummary: TradesSummary;
  tradesDetails: (EquityStatementEntry | OptionStatementEntry | BondStatementEntry)[];
  otherDetails: StatementEntry[];
};
