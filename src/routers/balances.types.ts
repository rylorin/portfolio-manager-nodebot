import { Balance } from "@/models";
import { Attributes } from "sequelize";

export type BalanceEntry = Omit<Attributes<Balance>, "portfolio" | "createdAt" | "updatedAt"> & {
  // portfolio:PortfolioEntry;
  baseRate: number | undefined;
  availCurrencies?: string[];
};
