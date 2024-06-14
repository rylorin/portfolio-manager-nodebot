import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Statement } from ".";

export const StatementStatus = {
  UNDEFINED_STATUS: 0,
  OPEN_STATUS: 1,
  CLOSE_STATUS: 2,
  EXPIRED_STATUS: 3,
  ASSIGNED_STATUS: 4,
  EXERCISED_STATUS: 5,
  CANCELLED_STATUS: 6,
} as const;
export type StatementStatus = (typeof StatementStatus)[keyof typeof StatementStatus];

@Table({ tableName: "equity_statement", timestamps: false, createdAt: false, updatedAt: false })
export class EquityStatement extends Model<
  InferAttributes<EquityStatement>,
  InferCreationAttributes<EquityStatement, { omit: "statement" }>
> {
  // id can be undefined during creation when using `autoIncrement`
  declare id: CreationOptional<number>;
  // timestamps!
  // createdAt can be undefined during creation
  declare createdAt: CreationOptional<Date>;
  // updatedAt can be undefined during creation
  declare updatedAt: CreationOptional<Date>;

  @BelongsTo(() => Statement, "id")
  public statement: Statement;

  /** quantity */
  @Column({ type: DataType.FLOAT(8, 2), defaultValue: 0 })
  declare quantity: number;

  /** price */
  @Column({ type: DataType.FLOAT(8, 3), defaultValue: 0 })
  declare price: number;

  /** proceeds */
  @Column({ type: DataType.FLOAT(8, 2), defaultValue: 0 })
  declare proceeds: number;

  /** fees */
  @Column({ type: DataType.FLOAT(8, 2), defaultValue: 0 })
  declare fees: number;

  /** realizedPnL */
  @Column({ type: DataType.FLOAT(8, 2), defaultValue: 0, field: "realized_pnl" })
  declare realizedPnL: number;

  /** status */
  @Column({ type: DataType.SMALLINT, defaultValue: 0 })
  declare status: StatementStatus;
}
