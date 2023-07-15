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
  };
  trade_id: number | undefined;
  price: number | undefined;
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
    expiration: string;
    strike: number;
    type: string;
    delta: number;
  };
  stock: {
    id: number;
    symbol: string;
    price: number | undefined;
  };
  engaged: number;
  risk: number;
  apy: number | undefined;
};
