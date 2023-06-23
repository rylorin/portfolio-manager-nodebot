import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Contract } from ".";

@Table({ tableName: "stock", timestamps: false, createdAt: false, updatedAt: false })
export class Stock extends Model {
  declare id: number;

  @BelongsTo(() => Contract, "id")
  public contract: Contract;

  @Column({ type: DataType.FLOAT, field: "historical_volatility" })
  declare historicalVolatility: number;

  @Column({ type: DataType.FLOAT, field: "eps_ttm" })
  declare epsTrailingTwelveMonths: number;

  @Column({ type: DataType.FLOAT, field: "eps_forward" })
  declare epsForward: number;

  @Column({ type: DataType.FLOAT, field: "dividend_ttm" })
  declare trailingAnnualDividendRate: number;
}
