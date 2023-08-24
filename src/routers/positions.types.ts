import { ContractType } from "../models/contract.types";

export type PositionEntry = {
  id: number;
  openDate: number;
  quantity: number;
  contract: {
    id: number;
    secType: ContractType;
    symbol: string;
    name: string;
    multiplier: number;
    currency: string;
    price: number | undefined;
    expiration: string | undefined; // format?
  };
  trade_id: number | undefined;
  price: number | undefined; // current unit price
  value: number | undefined;
  pru: number;
  cost: number;
  pnl: number | undefined;
  baseRate: number;
};

export type OptionPositionEntry = PositionEntry & {
  option: {
    id: number;
    symbol: string;
    expiration: string; // format?
    strike: number;
    type: string;
    delta: number | undefined;
  };
  stock: {
    id: number;
    symbol: string;
    price: number | undefined;
  };
  engaged: number;
  risk: number | undefined;
  apy: number | undefined;
};
