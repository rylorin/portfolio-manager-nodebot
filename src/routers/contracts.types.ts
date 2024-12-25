// import { OptionAttributes } from "../models";
import { Contract } from "@/models";
import { Attributes } from "sequelize";
import { OptionAttributes } from "../models/option.types";
import { OptionPositionEntry, PositionEntry } from "./positions.types";
import { StatementEntry } from "./statements.types";
import { TradeEntry } from "./trades.types";

// export type ContractEntry0 = {
//   id: number;
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

//   positions?: (PositionEntry | OptionPositionEntry)[];
//   trades?: TradeEntry[];
//   statements?: StatementEntry[];
// };

export type ContractEntry = Omit<Attributes<Contract>, "createdAt" | "updatedAt"> & {
  // Fields added by router
  positions?: (PositionEntry | OptionPositionEntry)[];
  trades?: TradeEntry[];
  statements?: StatementEntry[];
};

export type OptionEntry = ContractEntry & OptionAttributes;
