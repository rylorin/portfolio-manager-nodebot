import {
  Model,
  Table,
  Column,
  DataType,
  BelongsTo,
} from "sequelize-typescript";
import { OptionType } from "@stoqey/ib";

import { Contract, Stock } from ".";

@Table({ tableName: "option", timestamps: true, deletedAt: false })
export class Option extends Model {

  @BelongsTo(() => Contract, "id")
  public contract: Contract;

  // @ForeignKey(() => Stock)
  // @Column
  // public stock_id!: number;
  @BelongsTo(() => Stock, "stock_id")
  public stock: Stock;

  @Column({ type: DataType.DATEONLY, field: "last_trade_date" })
  // public lastTradeDate!: Date;
  get lastTradeDate(): Date {
    return new Date(this.getDataValue("lastTradeDate"));
  }
  set lastTradeDate(value: Date) {
    // Format date to YYYY-MM-DD
    const day: number = value.getDate();
    const month: number = value.getMonth() + 1;
    const year: number = value.getFullYear();
    const lastTradeDate: string = year + "-" + ((month < 10) ? "0" + month : month) + "-" + ((day < 10) ? ("0" + day) : day);
    this.setDataValue("lastTradeDate", lastTradeDate);
  }

  @Column({ type: DataType.FLOAT })
  public strike!: number;

  @Column({ type: DataType.ENUM("C", "P"), field: "call_or_put" })
  public callOrPut!: OptionType;

  @Column({ type: DataType.INTEGER, defaultValue: 100 })
  public multiplier: number;

  @Column({ type: DataType.FLOAT(3, 5), field: "implied_volatility" })
  public impliedVolatility: number;

  @Column({ type: DataType.FLOAT, field: "pv_dividend", defaultValue: 0 })
  public pvDividend: number;

  @Column({ type: DataType.FLOAT(1, 4) })
  public delta: number;

  @Column({ type: DataType.FLOAT })
  public gamma: number;

  @Column({ type: DataType.FLOAT })
  public vega: number;

  @Column({ type: DataType.FLOAT })
  public theta: number;

  get dte(): number {
    const dte: number = Math.floor(0.9 + (((new Date(this.getDataValue("lastTradeDate"))).getTime() - Date.now()) / 1000 / 86400));
    console.log("dte for", this.getDataValue("lastTradeDate"), dte);
    return dte;
  }

}