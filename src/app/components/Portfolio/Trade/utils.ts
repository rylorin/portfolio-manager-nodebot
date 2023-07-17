import { TradeStatus, TradeStrategy } from "../../../../models/trade.types";

export const tradeStatus2String = (status: TradeStatus): string => {
  switch (status) {
    case TradeStatus.open:
      return "open";
    case TradeStatus.closed:
      return "closed";
    default:
      return "undefined";
  }
};

export const tradeStrategy2String = (value: TradeStrategy): string => {
  // console.log(Object.keys(TradeStrategy), Object.values(TradeStrategy), Object.entries(TradeStrategy));
  return Object.keys(TradeStrategy)[value];
};
