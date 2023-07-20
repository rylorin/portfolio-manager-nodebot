import { OptionType } from "@stoqey/ib";
import { Optional } from "sequelize";

export type OptionAttributes = {
  id: number;
  updatedAt: Date;

  stock_id?: number;

  lastTradeDate: Date;
  strike: number;
  callOrPut: OptionType;
  multiplier: number;
  impliedVolatility?: number;
  pvDividend?: number;
  delta?: number;
  gamma?: number;
  vega?: number;
  theta?: number;
};

export type OptionCreationAttributes = Optional<OptionAttributes, "id" | "updatedAt">;
