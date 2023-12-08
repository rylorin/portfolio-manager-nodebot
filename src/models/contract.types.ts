import { Optional } from "sequelize";

export const ContractType = {
  Stock: "STK",
  Option: "OPT",
  Bag: "BAG",
  Cash: "CASH",
  Future: "FUT",
  FutureOption: "FOP", // maybe OPT
  Index: "IND",
  Bond: "BOND",
} as const;
export type ContractType = (typeof ContractType)[keyof typeof ContractType];

export type ContractAttributes = {
  id: number;
  updatedAt: Date;

  conId: number;
  symbol: string;
  secType: ContractType;
  exchange: string;
  currency: string;
  name?: string;
  price?: number;
  bid?: number;
  ask?: number;
  previousClosePrice?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
};

export type ContractCreationAttributes = Optional<ContractAttributes, "id" | "updatedAt">;
