import {
  CreationOptional,
  ForeignKey,
  HasOneGetAssociationMixin,
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
  /** Auto-incrementing primary key */
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  declare id: CreationOptional<number>;

  /** Timestamp when the record was created */
  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  declare createdAt: CreationOptional<Date>;

  /** Timestamp when the record was last updated */
  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  declare updatedAt: CreationOptional<Date>;

  /** Portfolio */
  declare portfolio_id: ForeignKey<Portfolio["id"]>;
  @BelongsTo(() => Portfolio, "portfolio_id")
  declare portfolio: Portfolio;

  /** Related Stock */
  declare stock_id: ForeignKey<Contract["id"]>;
  @BelongsTo(() => Contract, "stock_id")
  declare underlying: Contract;
  declare getUnderlying: HasOneGetAssociationMixin<Contract>;

  @Column({ type: DataType.SMALLINT, validate: { min: 0 }, defaultValue: 40 })
  declare lookupDays: number;

  @Column({ type: DataType.FLOAT, validate: { min: 0.05 }, defaultValue: 1 })
  declare minPremium: number;

  @Column({ type: DataType.ENUM(typeof CspStrategySetting), field: "csp_strategy", defaultValue: 0 })
  declare cspStrategy: CspStrategySetting;

  @Column({ type: DataType.FLOAT, field: "nav_ratio", validate: { min: 0, max: 1.0 }, defaultValue: 0 })
  declare navRatio: number;

  @Column({ type: DataType.FLOAT, validate: { min: -1.0, max: 0 }, defaultValue: -0.15 })
  declare cspDelta: number;

  /** rollPutStrategy */
  @Column({ type: DataType.ENUM(typeof StrategySetting), field: "roll_put_strategy", defaultValue: 0 })
  declare rollPutStrategy: StrategySetting;

  @Column({ type: DataType.SMALLINT, validate: { min: 0 }, defaultValue: 0 })
  declare rollPutDays: number;

  @Column({ type: DataType.ENUM(typeof StrategySetting), field: "cc_strategy", defaultValue: 0 })
  declare ccStrategy: StrategySetting;

  @Column({ type: DataType.FLOAT, validate: { min: 0, max: 1.0 }, defaultValue: 0.15 })
  declare ccDelta: number;

  @Column({ type: DataType.ENUM(typeof StrategySetting), field: "roll_call_strategy", defaultValue: 0 })
  declare rollCallStrategy: StrategySetting;

  @Column({ type: DataType.SMALLINT, validate: { min: 0 }, defaultValue: 0 })
  declare rollCallDays: number;
}
