import { InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import { Statement } from "./statement.model";

/**
 * Enum defining the possible statuses for an Equity Statement.
 */
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

/**
 * Represents an equity statement inheriting from `Statement`.
 */
@Table({
  tableName: "equity_statement",
  timestamps: false,
})
export class EquityStatement extends Model<
  InferAttributes<EquityStatement>,
  InferCreationAttributes<EquityStatement, { omit: "statement" }>
> {
  /** Primary key (inherited from `Statement`) */
  @ForeignKey(() => Statement)
  @Column({ primaryKey: true })
  declare id: number;

  /** Relationship with the `Statement` model */
  @BelongsTo(() => Statement, "id")
  declare statement: Statement;

  /** Quantity of equities in the statement */
  @Column({
    type: DataType.FLOAT(10, 4),
    allowNull: false,
    defaultValue: 0,
  })
  declare quantity: number;

  /** Price per equity */
  @Column({
    type: DataType.FLOAT(10, 3),
    allowNull: false,
    defaultValue: 0,
  })
  declare price: number;

  /** Total proceeds from the equities */
  @Column({
    type: DataType.FLOAT(10, 2),
    allowNull: false,
    defaultValue: 0,
  })
  declare proceeds: number;

  /** Fees associated with the transaction */
  @Column({
    type: DataType.FLOAT(10, 2),
    allowNull: false,
    defaultValue: 0,
  })
  declare fees: number;

  /** Realized profit or loss */
  @Column({
    type: DataType.FLOAT(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: "realized_pnl",
  })
  declare realizedPnL: number;

  /** Status of the statement */
  @Column({
    type: DataType.ENUM(typeof StatementStatus),
    allowNull: false,
    defaultValue: StatementStatus.UNDEFINED_STATUS,
  })
  declare status: StatementStatus;
}
