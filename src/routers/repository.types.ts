import { ContractAttributes } from "../models/contract.types";
import { OptionAttributes } from "../models/option.types";

export type ContractEntry = ContractAttributes;
export type OptionEntry = ContractEntry & OptionAttributes;
