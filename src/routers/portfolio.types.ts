import { Attributes } from "sequelize";
import { ContractEntry } from ".";
import { Portfolio } from "../models";

export type PortfolioEntry = Omit<
  Attributes<Portfolio>,
  "benchmark" | "positions" | "balances" | "baseRates" | "settings" | "statements" | "createdAt" | "updatedAt"
> & {
  benchmark: ContractEntry;
};
