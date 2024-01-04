export const StatementTypes = {
  EquityStatement: "Trade",
  OptionStatement: "TradeOption",
  DividendStatement: "Dividend",
  TaxStatement: "Tax",
  InterestStatement: "Interest",
  FeeStatement: "OtherFee",
  CorporateStatement: "CorporateStatement",
  CashStatement: "Cash",
  BondStatement: "Bond",
} as const;
export type StatementTypes = (typeof StatementTypes)[keyof typeof StatementTypes];
