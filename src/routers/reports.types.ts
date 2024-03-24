import { DividendStatementEntry, InterestStatementEntry, WithHoldingStatementEntry } from "./statements.types";

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
  totalAmountInBase: number;
};

/**
 * Dididend Summary entry data transfered between frontend and backend
 */
export type InterestsSummary = {
  netCredit: number;
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
  dividendsDetails: DividendStatementEntry[];
  interestsSummary: InterestsSummary;
  interestsDetails: (InterestStatementEntry | WithHoldingStatementEntry)[];
};
