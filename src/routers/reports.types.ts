import {
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
};

/**
 * Dididend Summary entry data transfered between frontend and backend
 */
export type InterestsSummary = {
  grossCredit: number;
  netDebit: number;
  withHolding: number;
  totalAmountInBase: number;
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
  totalPnLInBase: number;
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
  interestsSummary: InterestsSummary;
  interestsDetails: (InterestStatementEntry | WithHoldingStatementEntry)[];
  feesSummary: FeesSummary;
  feesDetails: FeeStatementEntry[];
  tradesSummary: TradesSummary;
  tradesDetails: (EquityStatementEntry | OptionStatementEntry)[];
  otherDetails: StatementEntry[];
};
