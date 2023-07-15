export const TradeStatus = {
  undefined: 0,
  open: 1,
  closed: 2,
};
export type TradeStatus = (typeof TradeStatus)[keyof typeof TradeStatus];

export const TradeStrategy = {
  undefined: 0,
  "long stock": 1,
  "short stock": 2,
  "buy write": 3,
  "long call": 4,
  "naked short call": 5,
  "covered short call": 6,
  "long put": 7,
  "short put": 8,
  "the wheel": 9,
  "risk reversal": 10,
  "bull spread": 11,
  "bear spread": 12,
  "front ratio spread": 13,
  "short strangle": 14,
  "long strangle": 15,
  "long straddle": 16,
  "short straddle": 17,
  "iron condor": 18,
  "short iron condor": 19,
} as const;
export type TradeStrategy = (typeof TradeStrategy)[keyof typeof TradeStrategy];
