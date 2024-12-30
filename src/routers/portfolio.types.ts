import { Attributes } from "sequelize";
import { ContractEntry } from ".";
import { Portfolio, Setting } from "../models";

export type SettingEntry = Omit<Attributes<Setting>, "underlying" | "portfolio" | "createdAt" | "updatedAt"> & {
  underlying: ContractEntry;
};

export type PortfolioEntry = Omit<
  Attributes<Portfolio>,
  "benchmark" | "positions" | "balances" | "baseRates" | "settings" | "statements" | "createdAt" | "updatedAt"
> & {
  benchmark: ContractEntry;
  settings: SettingEntry[];
};
