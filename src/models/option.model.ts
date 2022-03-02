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

  /** The asset symbol. */
  @Column({ type: DataType.DATEONLY, field: 'last_trade_date' })
  public lastTradeDate!: Date;

  @Column({ type: DataType.FLOAT })
  public strike!: number;

  @Column({ type: DataType.ENUM('C', 'P'), field: 'call_or_put' })
  public callOrPut!: string;

  @Column({ type: DataType.INTEGER, defaultValue: 100 })
  public multiplier: number;

  @Column({ type: DataType.FLOAT, field: 'implied_volatility' })
  public impliedVolatility: number;

  @Column({ type: DataType.FLOAT })
  public delta: number; 

};