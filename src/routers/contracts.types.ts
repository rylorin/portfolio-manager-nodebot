import { ContractAttributes, OptionAttributes } from "../models";
import { OptionPositionEntry, PositionEntry } from "./positions.types";
import { TradeEntry } from "./trades.types";

export type ContractEntry = ContractAttributes & {
  positions: (PositionEntry | OptionPositionEntry)[];
  trades: TradeEntry[];
};
export type OptionEntry = ContractEntry & OptionAttributes;
