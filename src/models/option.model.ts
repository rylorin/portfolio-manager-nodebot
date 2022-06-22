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
    // console.log("lastTradeDate", value, value.toDateString());
    this.setDataValue("lastTradeDate", value.toISOString().substring(0, 10));
  }

  @Column({ type: DataType.FLOAT })
  public strike!: number;

  @Column({ type: DataType.ENUM("C", "P"), field: "call_or_put" })
  public callOrPut!: OptionType;

  @Column({ type: DataType.INTEGER, defaultValue: 100 })
  public multiplier: number;

  @Column({ type: DataType.FLOAT(1, 3), field: "implied_volatility" })
  get impliedVolatility(): number {
    return this.getDataValue("impliedVolatility");
  }
  set impliedVolatility(value: number) {
    this.setDataValue("impliedVolatility", (Math.round(value * 1000) / 1000));
  }

  @Column({ type: DataType.FLOAT, field: "pv_dividend" })
  get pvDividend(): number {
    return this.getDataValue("pvDividend");
  }
  set pvDividend(value: number) {
    this.setDataValue("pvDividend", (Math.round(value * 1000) / 1000));
  }

  @Column({ type: DataType.FLOAT(1, 3) })
  get delta(): number {
    return this.getDataValue("delta");
  }
  set delta(value: number) {
    this.setDataValue("delta", (Math.round(value * 1000) / 1000));
  }

  @Column({ type: DataType.FLOAT })
  get gamma(): number {
    return this.getDataValue("gamma");
  }
  set gamma(value: number) {
    this.setDataValue("gamma", (Math.round(value * 1000) / 1000));
  }

  @Column({ type: DataType.FLOAT })
  get vega(): number {
    return this.getDataValue("vega");
  }
  set vega(value: number) {
    this.setDataValue("vega", (Math.round(value * 1000) / 1000));
  }

  @Column({ type: DataType.FLOAT })
  get theta(): number {
    return this.getDataValue("theta");
  }
  set theta(value: number) {
    this.setDataValue("theta", (Math.round(value * 1000) / 1000));
  }

}