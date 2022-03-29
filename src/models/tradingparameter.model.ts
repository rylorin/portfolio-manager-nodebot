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
  
import { Stock } from '.';

@Table({ tableName: "trading_parameters", timestamps: false, createdAt: false, updatedAt: false })
export class TradingParameter extends Model {

  @Column({ type: DataType.INTEGER })
  public portfolio: number;

  @BelongsTo(() => Stock, 'stock_id')
  public underlying: Stock;

  @Column({ type: DataType.FLOAT, field: 'nav_ratio' })
  public navRatio: number;

};