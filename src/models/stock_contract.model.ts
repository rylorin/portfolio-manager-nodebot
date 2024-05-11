import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Contract } from ".";

@Table({ tableName: "stock_contract" })
export class StockContract extends Model<
  InferAttributes<StockContract>,
  InferCreationAttributes<StockContract, { omit: "contract" }>
> {
  // id can be undefined during creation when using `autoIncrement`
  declare id: CreationOptional<number>;
  // timestamps!
  // createdAt can be undefined during creation
  declare createdAt: CreationOptional<Date>;
  // updatedAt can be undefined during creation
  declare updatedAt: CreationOptional<Date>;

  @BelongsTo(() => Contract, "id")
  declare contract: Contract;

  @Column({ type: DataType.FLOAT, field: "historical_volatility" })
  declare historicalVolatility?: number;

  @Column({ type: DataType.FLOAT, field: "eps_ttm" })
  declare epsTrailingTwelveMonths?: number;

  @Column({ type: DataType.FLOAT, field: "eps_forward" })
  declare epsForward?: number;

  @Column({ type: DataType.FLOAT, field: "dividend_ttm" })
  declare trailingAnnualDividendRate?: number;

  @Column({ type: DataType.STRING })
  declare industry: string;

  @Column({ type: DataType.STRING })
  declare category: string;

  @Column({ type: DataType.STRING })
  declare subcategory: string;

  // Unused
  // @Column({ type: DataType.STRING })
  // declare description: string;
}
