import { TradeStatus } from "../../../models/trade.model";

export const tradeStatus2String = (status: TradeStatus): string => {
  switch (status as number) {
    // case TradeStatus.open:
    case 1:
      return "open";
    // case TradeStatus.closed:
    case 2:
      return "closed";
    default:
      return "undefined";
  }
};
