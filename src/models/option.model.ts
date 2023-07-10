import { OptionType } from "@stoqey/ib";
import { Optional } from "sequelize";
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import { Contract } from "./contract.model";

export type OptionAttributes = {
  id: number;
  updatedAt: Date;

  stock_id?: number;

  lastTradeDate: string;
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

@Table({ tableName: "option", timestamps: true, deletedAt: false })
export class Option extends Model<OptionAttributes, OptionCreationAttributes> {
  declare id: number;

  @BelongsTo(() => Contract, "id")
  declare contract: Contract;

  /** Underlying */
  @ForeignKey(() => Contract)
  @Column
  declare stock_id: number;
  @BelongsTo(() => Contract, "stock_id")
  declare stock: Contract;

  @Column({ type: DataType.DATEONLY, field: "last_trade_date" })
  get lastTradeDate(): Date {
    return new Date(this.getDataValue("lastTradeDate"));
  }
  set lastTradeDate(value: Date | string) {
    if (value instanceof Date) {
      // Format date to YYYY-MM-DD
      const day: number = value.getDate();
      const month: number = value.getMonth() + 1;
      const year: number = value.getFullYear();
      const lastTradeDate: string =
        year + "-" + (month < 10 ? "0" + month : month) + "-" + (day < 10 ? "0" + day : day);
      this.setDataValue("lastTradeDate", lastTradeDate);
    } else if (typeof value == "string") {
      this.setDataValue("lastTradeDate", value.substring(0, 10));
    }
  }

  @Column({ type: DataType.FLOAT })
  declare strike: number;

  @Column({ type: DataType.ENUM("C", "P"), field: "call_or_put" })
  declare callOrPut: OptionType;

  @Column({ type: DataType.INTEGER, defaultValue: 100 })
  declare multiplier: number;

  @Column({ type: DataType.FLOAT(3, 5), field: "implied_volatility" })
  declare impliedVolatility: number;

  @Column({ type: DataType.FLOAT, field: "pv_dividend", defaultValue: 0 })
  declare pvDividend: number;

  @Column({ type: DataType.FLOAT(1, 4) })
  declare delta: number;

  @Column({ type: DataType.FLOAT })
  declare gamma: number;

  @Column({ type: DataType.FLOAT })
  declare vega: number;

  @Column({ type: DataType.FLOAT })
  declare theta: number;

  get dte(): number {
    const dte: number = Math.floor(
      0.9 + (new Date(this.getDataValue("lastTradeDate")).getTime() - Date.now()) / 1000 / 86400,
    );
    // console.log("dte for", this.getDataValue("lastTradeDate"), dte);
    return dte;
  }
}
