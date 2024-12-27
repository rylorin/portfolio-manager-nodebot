export const ContractType = {
  Stock: "STK",
  Option: "OPT",
  Bag: "BAG",
  Cash: "CASH",
  Future: "FUT",
  FutureOption: "FOP",
  Index: "IND",
  Bond: "BOND",
} as const;
export type ContractType = (typeof ContractType)[keyof typeof ContractType];

export const OptionType = {
  Call: "C",
  Put: "P",
} as const;
export type OptionType = (typeof OptionType)[keyof typeof OptionType];

// export interface ContractAttributes {
//   id: number;
//   updatedAt: Date;

//   conId: number;
//   symbol: string;
//   secType: ContractType;
//   exchange: string;
//   currency: string;
//   name?: string;
//   price?: number;
//   bid?: number;
//   ask?: number;
//   previousClosePrice?: number;
//   fiftyTwoWeekLow?: number;
//   fiftyTwoWeekHigh?: number;
// }

// export type ContractCreationAttributes = Optional<ContractAttributes, "id" | "updatedAt">;
