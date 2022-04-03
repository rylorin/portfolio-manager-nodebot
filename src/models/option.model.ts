import {
  Model,
  Table,
  Column,
  DataType,
  HasMany,
  HasOne,
  BelongsToMany,
  BelongsTo,
  ForeignKey
} from "sequelize-typescript";
import { OptionType } from "@stoqey/ib";

import { Contract, Stock } from '.';

@Table({ tableName: "option", timestamps: true, deletedAt: false, updatedAt: false })
export class Option extends Model {

  @BelongsTo(() => Contract, 'id')
  public contract: Contract;

  // @ForeignKey(() => Stock)
  // @Column
  // public stock_id!: number;
  @BelongsTo(() => Stock, 'stock_id')
  public stock: Stock;

  // we could change DATEONLY to DATE when offset with timezone
  @Column({ type: DataType.DATEONLY, field: 'last_trade_date' })
  public lastTradeDate!: Date;
  // @Column({ type: DataType.INTEGER })
  // public expiration!: number;

  @Column({ type: DataType.FLOAT })
  public strike!: number;

  @Column({ type: DataType.ENUM('C', 'P'), field: 'call_or_put' })
  public callOrPut!: OptionType;

  @Column({ type: DataType.INTEGER, defaultValue: 100 })
  public multiplier: number;

  @Column({ type: DataType.FLOAT, field: 'implied_volatility' })
  public impliedVolatility: number;

  @Column({ type: DataType.FLOAT })
  public delta: number; 

};