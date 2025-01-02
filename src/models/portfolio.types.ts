export const CashStrategy = {
  Off: 0,
  Balance: 1,
  // "Options value":2,
  // "Options risk":3,
} as const;
export type CashStrategy = (typeof CashStrategy)[keyof typeof CashStrategy];

export const cashStrategy2String = (strategy: CashStrategy): string => {
  // const result = Object.entries(TradeStrategy).find((item) => item[1] == strategy)[0];
  // console.log(
  //   "tradeStrategy2String",
  //   strategy,
  //   Object.keys(TradeStrategy),
  //   Object.values(TradeStrategy),
  //   Object.entries(TradeStrategy),
  //   result,
  // );
  // return result;
  return Object.entries(CashStrategy).find((item) => item[1] == strategy)[0];
};
