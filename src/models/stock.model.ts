import {
  Model,
  Table,
  Column,
  DataType,
  BelongsTo,
} from "sequelize-typescript";
import { Contract } from ".";

@Table({ tableName: "stock", timestamps: false, createdAt: false, updatedAt: false })
export class Stock extends Model {

  @BelongsTo(() => Contract, "id")
  public contract: Contract;

  @Column({ type: DataType.FLOAT, field: "historical_volatility" })
  public historicalVolatility: number;

}