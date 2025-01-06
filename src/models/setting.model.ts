import {
  CreationOptional,
  ForeignKey,
  HasManyGetAssociationsMixin,
  InferAttributes,
  InferCreationAttributes,
} from "sequelize";
import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Contract } from "./contract.model";
import { Portfolio } from "./portfolio.model";
import { CspStrategySetting, StrategySetting } from "./types";

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
  declare getUnderlying: HasManyGetAssociationsMixin<Contract>;

  @Column({ type: DataType.SMALLINT, defaultValue: 40 })
  declare lookupDays: number;

  @Column({ type: DataType.FLOAT, defaultValue: 1 })
  declare minPremium: number;

  @Column({ type: DataType.ENUM(typeof CspStrategySetting), field: "csp_strategy", defaultValue: 0 })
  declare cspStrategy: CspStrategySetting;

  @Column({ type: DataType.FLOAT, field: "nav_ratio", defaultValue: 0 })
  declare navRatio: number;

  /** rollPutStrategy */
  @Column({ type: DataType.ENUM(typeof StrategySetting), field: "roll_put_strategy", defaultValue: 0 })
  declare rollPutStrategy: StrategySetting;

  @Column({ type: DataType.ENUM(typeof StrategySetting), field: "cc_strategy", defaultValue: 0 })
  declare ccStrategy: StrategySetting;

  @Column({ type: DataType.FLOAT(3, 2), defaultValue: 0.15 })
  declare ccDelta: number;

  @Column({ type: DataType.ENUM(typeof StrategySetting), field: "roll_call_strategy", defaultValue: 0 })
  declare rollCallStrategy: StrategySetting;
}
