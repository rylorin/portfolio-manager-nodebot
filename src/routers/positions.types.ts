import { SecType } from "@stoqey/ib";

export type PositionEntry = {
  id: number;
  openDate: number;
  quantity: number;
  contract: {
    id: number;
    secType: SecType;
    symbol: string;
    name: string;
    multiplier: number;
    currency: string;
    price: number;
  };
  trade_id: number;
  price: number;
  value: number;
  pru: number;
  cost: number;
  pnl: number;
  baseRate: number;
};

export type OptionPositionEntry = PositionEntry & {
  option: {
    id: number;
    symbol: string;
    expiration: string;
    strike: number;
    type: string;
    delta: number;
  };
  stock: {
    id: number;
    symbol: string;
    price: number;
  };
  engaged: number;
  risk: number;
  apy: number | undefined;
};
