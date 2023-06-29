import { TradeStatus } from "../../../models/types";

export const tradeStatus2String = (status: TradeStatus): string => {
  if (status === TradeStatus.open) {
    console.log("ANTOINE");
  }

  switch (status) {
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
