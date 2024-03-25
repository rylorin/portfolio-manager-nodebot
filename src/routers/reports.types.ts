import {
  DividendStatementEntry,
  InterestStatementEntry,
  TaxStatementEntry,
  WithHoldingStatementEntry,
} from "./statements.types";

/**
 * Dididend details entry data transfered between frontend and backend
 */
// type DividendDetail = {
//   portfolioId: number;
//   date: number;
//   currency: string;
//   country: string;
//   grossAmount: number;
//   amountInBase: number;
// };

/**
 * Dididend Summary entry data transfered between frontend and backend
 */
export type DididendSummary = {
  //   year: number;
  //   month: number;
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
 * Report entry data transfered between frontend and backend
 */
export type ReportEntry = {
  portfolioId: number;
  year: number;
  month: number;
  dividendsSummary: DididendSummary[];
  dividendsDetails: (DividendStatementEntry | TaxStatementEntry)[];
  interestsSummary: InterestsSummary;
  interestsDetails: (InterestStatementEntry | WithHoldingStatementEntry)[];
};
