export const ContractType = {
  Stock: "STK",
  Option: "OPT",
  Bag: "BAG",
  Cash: "CASH",
  Future: "FUT",
  FutureOption: "FOP", // maybe OPT
  Index: "IND",
} as const;
export type ContractType = (typeof ContractType)[keyof typeof ContractType];
