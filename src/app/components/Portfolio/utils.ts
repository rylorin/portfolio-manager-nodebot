import { TradeStatus, TradeStrategy } from "../../../models/trade.types";

export const tradeStatus2String = (status: TradeStatus): string => {
  console.log("tradeStatus2String:", status, TradeStatus[status]);
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
  console.log("tradeStrategy2String:", value, TradeStrategy[value]);
  switch (value) {
    case TradeStrategy["short put"]:
      return "short put";
    default:
      return "undefined";
  }
};
