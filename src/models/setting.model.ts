import { CreationOptional, ForeignKey, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Contract } from "./contract.model";
import { Portfolio } from "./portfolio.model";

@Table({ tableName: "trading_parameters", timestamps: true })
export class Setting extends Model<
  InferAttributes<Setting>,
  InferCreationAttributes<Setting, { omit: "underlying" | "portfolio" }>
> {
  // id can be undefined during creation when using `autoIncrement`
  declare id: CreationOptional<number>;
  // timestamps!
  // createdAt can be undefined during creation
  declare createdAt: CreationOptional<Date>;
  // updatedAt can be undefined during creation
  declare updatedAt: CreationOptional<Date>;

  /** Portfolio */
  declare portfolio_id: ForeignKey<Portfolio["id"]>;
  @BelongsTo(() => Portfolio, "portfolio_id")
  declare portfolio: Portfolio;

  /** Related Stock */
  declare stock_id: ForeignKey<Contract["id"]>;
  @BelongsTo(() => Contract, "stock_id")
  declare underlying: Contract;

  @Column({ type: DataType.SMALLINT, field: "csp_strategy" })
  declare cspStrategy: number;

  /** NAV ratio */
  @Column({ type: DataType.FLOAT, field: "nav_ratio" })
  declare navRatio: number;

  /** rollPutStrategy */
  @Column({ type: DataType.SMALLINT, field: "roll_put_strategy" })
  declare rollPutStrategy: number;

  @Column({ type: DataType.SMALLINT, field: "roll_call_strategy" })
  declare rollCallStrategy: number;

  @Column({ type: DataType.SMALLINT, field: "cc_strategy" })
  declare ccStrategy: number;

  @Column({ type: DataType.SMALLINT })
  declare lookupDays: number;
}
