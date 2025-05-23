import {
  BondStatementEntry,
  CorporateStatementEntry,
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
export interface DididendSummary {
  country: string;
  grossAmountInBase: number;
  taxes: number;
  netAmountInBase: number;
}

/**
 * Interest Summary entry data transfered between frontend and backend
 */
export interface InterestsSummary {
  country: string;
  grossCredit: number;
  netDebit: number;
  withHolding: number;
  netTotal: number;
}

/**
 * Fees summary
 */
export interface FeesSummary {
  totalAmountInBase: number;
}

/**
 * Trades summary
 */
export interface TradesSummary {
  stocksPnLInBase: number;
  futuresPnLInBase: number;
  optionsPnLInBase: number;
  fopPnlInBase: number;
  bondPnLInBase: number;
  totalPnL: number;
}

/**
 * Report entry data transfered between frontend and backend
 */
export interface ReportEntry {
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
  tradesDetails: (EquityStatementEntry | OptionStatementEntry | BondStatementEntry | CorporateStatementEntry)[];
  otherDetails: StatementEntry[];
}
