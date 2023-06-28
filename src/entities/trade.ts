export const TradeStatus = {
  undefined: 0,
  open: 1,
  closed: 2,
} as const;
export type TradeStatus = (typeof TradeStatus)[keyof typeof TradeStatus];
