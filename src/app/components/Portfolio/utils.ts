import { TradeStatus } from "../../../models/trade.types";

export const tradeStatus2String = (status: TradeStatus): string => {
  console.log("tradeStatus2String:", status, TradeStatus[status]);
  switch (status) {
    case TradeStatus.open:
      // case 1:
      return "open";
    case TradeStatus.closed:
      // case 2:
      return "closed";
    default:
      return "undefined";
  }
};
