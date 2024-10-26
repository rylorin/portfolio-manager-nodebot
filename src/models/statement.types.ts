export const StatementTypes = {
  EquityStatement: "Trade",
  OptionStatement: "TradeOption",
  DividendStatement: "Dividend",
  TaxStatement: "Tax",
  InterestStatement: "Interest",
  WithHoldingStatement: "WithHolding",
  FeeStatement: "OtherFee",
  CorporateStatement: "CorporateStatement",
  CashStatement: "Cash",
  BondStatement: "Bond",
  SalesTaxStatement: "SalesTax",
} as const;
export type StatementTypes = (typeof StatementTypes)[keyof typeof StatementTypes];
