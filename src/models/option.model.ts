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

  // we could change DATEONLY to DATE when offset with timezone
  @Column({ type: DataType.DATEONLY, field: "last_trade_date" })
  public lastTradeDate!: Date;

  @Column({ type: DataType.FLOAT })
  public strike!: number;

  @Column({ type: DataType.ENUM("C", "P"), field: "call_or_put" })
  public callOrPut!: OptionType;

  @Column({ type: DataType.INTEGER, defaultValue: 100 })
  public multiplier: number;

  @Column({ type: DataType.FLOAT(1, 3), field: "implied_volatility" })
  // public impliedVolatility: number;
  get impliedVolatility(): number {
    return this.getDataValue("impliedVolatility");
  }
  set impliedVolatility(value: number) {
    this.setDataValue("impliedVolatility", (Math.round(value * 1000) / 1000));
  }

  @Column({ type: DataType.FLOAT, field: "pv_dividend" })
  // public pvDividend: number;
  get pvDividend(): number {
    return this.getDataValue("pvDividend");
  }
  set pvDividend(value: number) {
    this.setDataValue("pvDividend", (Math.round(value * 1000) / 1000));
  }

  @Column({ type: DataType.FLOAT(1, 3) })
  // public delta: number; 
  get delta(): number {
    return this.getDataValue("delta");
  }
  set delta(value: number) {
    this.setDataValue("delta", (Math.round(value * 1000) / 1000));
  }

  @Column({ type: DataType.FLOAT })
  // public gamma: number;
  get gamma(): number {
    return this.getDataValue("gamma");
  }
  set gamma(value: number) {
    this.setDataValue("gamma", (Math.round(value * 1000) / 1000));
  }

  @Column({ type: DataType.FLOAT })
  // public vega: number;
  get vega(): number {
    return this.getDataValue("vega");
  }
  set vega(value: number) {
    this.setDataValue("vega", (Math.round(value * 1000) / 1000));
  }

  @Column({ type: DataType.FLOAT })
  // public theta: number; 
  get theta(): number {
    return this.getDataValue("theta");
  }
  set theta(value: number) {
    this.setDataValue("theta", (Math.round(value * 1000) / 1000));
  }

}