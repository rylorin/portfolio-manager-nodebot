export const TradeStatus = {
  undefined: 0,
  open: 1,
  closed: 2,
} as const;
export type TradeStatus = (typeof TradeStatus)[keyof typeof TradeStatus];

// export enum TradeStatus {
//   undefined = 0,
//   open = 1,
//   closed = 2,
// }

export const TradeStrategy = {
  undefined: 0,
  "long stock": 1,
  "short stock": 2,
  "buy write": 17,
  "long call": 3,
  "naked short call": 4,
  "covered short call": 7,
  "long put": 5,
  "short put": 6,
  "the wheel": 8,
  "risk reversal": 9,
  "bull spread": 10,
  "bear spread": 12,
  "front ratio spread": 16,
  "short strangle": 11,
  "long strangle": 13,
  "long straddle": 14,
  "short straddle": 15,
  "iron condor": 18,
  "short iron condor": 19,
  "synthetic short call": 20,
  box: 21,
} as const;
export type TradeStrategy = (typeof TradeStrategy)[keyof typeof TradeStrategy];

// export enum TradeStrategy {
//   undefined = 0,
//   "long stock" = 1,
//   "short stock" = 2,
//   "buy write" = 17,
//   "long call" = 3,
//   "naked short call" = 4,
//   "covered short call" = 7,
//   "long put" = 5,
//   "short put" = 6,
//   "the wheel" = 8,
//   "risk reversal" = 9,
//   "bull spread" = 10,
//   "bear spread" = 12,
//   "front ratio spread" = 16,
//   "short strangle" = 11,
//   "long strangle" = 13,
//   "long straddle" = 14,
//   "short straddle" = 15,
//   "iron condor" = 18,
//   "short iron condor" = 19,
//   "synthetic short call" = 20,
// }
