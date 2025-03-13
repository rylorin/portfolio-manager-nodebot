import { OpenOrder } from "@/models";
import { Attributes } from "sequelize";
import { ContractEntry } from ".";

export type OrderEntry = Omit<Attributes<OpenOrder>, "portfolio" | "contract" | "createdAt" | "updatedAt"> & {
  contract: ContractEntry;
};
