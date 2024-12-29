import { Contract, OptionContract } from "@/models";
import { Attributes } from "sequelize";
import { OptionPositionEntry, PositionEntry, StatementEntry, TradeEntry } from "./";

export type ContractEntry = Omit<
  Attributes<Contract>,
  "createdAt" | "updatedAt" | "positions" | "trades" | "statements"
> & {
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

export type OptionContractEntry = Omit<Attributes<OptionContract>, "createdAt" | "updatedAt" | "contract" | "stock"> & {
  // Make JSON compatible
  createdAt: number;
  updatedAt: number;

  // Virtual properties
  expiryDate: number;
  expiry: number;
  dte: number;

  // Relations
  contract?: ContractEntry;
  stock?: ContractEntry;
};
