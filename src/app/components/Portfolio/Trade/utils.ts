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

export const tradeStrategy2String = (strategy: TradeStrategy): string => {
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
  return Object.entries(TradeStrategy).find((item) => item[1] == strategy)[0];
};
