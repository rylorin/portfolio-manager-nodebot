import { Attributes } from "sequelize";
import { ContractEntry } from ".";
import { ContractType, Position } from "../models/";

// export type PositionEntry0 = {
//   id: number;
//   contract: {
//     id: number;
//     secType: ContractType;
//     symbol: string;
//     name: string;
//     multiplier: number;
//     currency: string;
//     price: number | undefined;
//     expiration: string | undefined; // format?
//   };
//   cost: number;
//   quantity: number;
//   trade_unit_id: number | undefined;

//   openDate: number;
//   price: number | undefined; // current unit price
//   value: number | undefined;
//   pru: number;
//   pnl: number | undefined;
//   baseRate: number;
// };

export type PositionEntry = Omit<
  Attributes<Position>,
  "portfolio" | "contract" | "trade" | "createdAt" | "updatedAt" | "associations"
> & {
  contract: ContractEntry & {
    // Fields added by router
    expiration: string | undefined; // format?
  };
  // Fields added by router
  openDate: number;
  price: number | undefined; // current unit price
  value: number | undefined;
  pru: number;
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
  underlying: {
    id: number;
    secType: ContractType;
    symbol: string;
    price: number | undefined;
  };
  engaged: number;
  risk: number | undefined;
  apy: number | undefined;
};
