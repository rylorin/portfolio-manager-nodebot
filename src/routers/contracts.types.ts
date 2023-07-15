import { OptionAttributes } from "../models";
import { ContractType } from "../models/contract.types";
import { OptionPositionEntry, PositionEntry } from "./positions.types";
import { StatementEntry } from "./statements.types";
import { TradeEntry } from "./trades.types";

export type ContractEntry = {
  id: number;

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

  positions?: (PositionEntry | OptionPositionEntry)[];
  trades?: TradeEntry[];
  statements?: StatementEntry[];
};
export type OptionEntry = ContractEntry & OptionAttributes;
