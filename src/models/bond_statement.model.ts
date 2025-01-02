import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import { Statement } from "./statement.model";

/**
 * Represents a financial statement specifically for bonds, inheriting from `Statement`.
 */
@Table({ tableName: "bond_statement", timestamps: false })
export class BondStatement extends Model<
  InferAttributes<BondStatement>,
  InferCreationAttributes<BondStatement, { omit: "statement" }>
> {
  /** Primary key (inherited from `Statement`) */
  @ForeignKey(() => Statement)
  @Column({ primaryKey: true })
  declare id: number;

  /** Timestamps (inherited but unused in this table) */
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  /** Relationship with the `Statement` model */
  @BelongsTo(() => Statement, "id")
  declare statement: Statement;

  /** Country of the bond (ISO 3166-1 alpha-2 code) */
  @Column({
    type: DataType.CHAR(2),
    allowNull: false,
    validate: {
      isAlpha: true,
      isUppercase: true,
      len: [2, 2],
    },
  })
  declare country: string;

  /** Accrued interests already part of price and PnL */
  @Column({
    type: DataType.FLOAT,
    allowNull: true,
    field: "accruedInt",
  })
  declare accruedInterests?: number;

  /** Proceeds from the bond transaction */
  @Column({
    type: DataType.FLOAT(8, 2),
    allowNull: false,
    defaultValue: 0,
  })
  declare proceeds: number;

  /** Quantity of bonds involved in the transaction */
  @Column({
    type: DataType.FLOAT(8, 0),
    allowNull: false,
    defaultValue: 0,
  })
  declare quantity: number;

  /** Trade price of the bond */
  @Column({
    type: DataType.FLOAT(8, 5),
    allowNull: false,
    field: "tradePrice",
  })
  declare price: number;

  /** Fees associated with the bond transaction */
  @Column({
    type: DataType.FLOAT(8, 2),
    allowNull: false,
    defaultValue: 0,
  })
  declare fees: number;

  /** Realized profit or loss from the bond transaction */
  @Column({
    type: DataType.FLOAT(8, 2),
    allowNull: false,
    defaultValue: 0,
    field: "pnl",
  })
  declare realizedPnL: number;
}
