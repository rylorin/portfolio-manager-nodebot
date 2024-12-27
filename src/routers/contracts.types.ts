// import { OptionAttributes } from "../models";
import { Contract } from "@/models";
import { Attributes } from "sequelize";
import { OptionAttributes } from "../models/types";
import { OptionPositionEntry, PositionEntry, StatementEntry, TradeEntry } from "./";

export type ContractEntry = Omit<Attributes<Contract>, "createdAt" | "updatedAt"> & {
  // Virtual properties
  livePrice: number | null;

  // Make JSON compatible
  createdAt: number;
  updatedAt: number;

  // Relations
  positions?: (PositionEntry | OptionPositionEntry)[];
  trades?: TradeEntry[];
  statements?: StatementEntry[];
};

export type OptionEntry = ContractEntry & OptionAttributes;
