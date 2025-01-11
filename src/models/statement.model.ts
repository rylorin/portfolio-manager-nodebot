import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import { Contract } from "./contract.model";
import { Portfolio } from "./portfolio.model";
import { StatementTypes } from "./statement.types";
import { Trade } from "./trade.model";

/**
 * Represents a financial statement associated with a portfolio, stock, or trade.
 */
@Table({ tableName: "statement", timestamps: true })
export class Statement extends Model<
  InferAttributes<Statement>,
  InferCreationAttributes<Statement, { omit: "stock" | "portfolio" | "trade" }>
> {
  /** Primary key */
  declare id: CreationOptional<number>;

  /** Timestamps */
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  /** Portfolio relation */
  @ForeignKey(() => Portfolio)
  @Column({ allowNull: false })
  declare portfolio_id: number;

  @BelongsTo(() => Portfolio, "portfolio_id")
  declare portfolio: Portfolio;

  /** Type of the statement */
  @Column({
    type: DataType.ENUM(typeof StatementTypes),
    field: "statement_type",
    allowNull: false,
  })
  declare statementType: StatementTypes;

  /** Date of the statement */
  @Column({ type: DataType.DATE, allowNull: false })
  declare date: Date;

  /** Currency of the statement */
  @Column({
    type: DataType.CHAR(3),
    allowNull: false,
    validate: {
      isAlpha: true,
      isUppercase: true,
      len: [3, 3],
    },
  })
  declare currency: string;

  /** Net cash, calculated as proceeds + commission */
  @Column({
    type: DataType.FLOAT,
    allowNull: false,
    defaultValue: 0,
  })
  declare netCash: number;

  /** Description of the statement */
  @Column({ type: DataType.STRING, allowNull: true })
  declare description: string;

  /** Transaction ID, if applicable */
  @Column({ type: DataType.INTEGER, allowNull: true, field: "transaction_id" })
  declare transactionId: number;

  /** FX rate to base currency */
  @Column({ type: DataType.FLOAT, allowNull: true, field: "fx_rate_to_base" })
  declare fxRateToBase: number;

  /** Related stock (underlying) */
  @ForeignKey(() => Contract)
  @Column({ allowNull: true })
  declare stock_id: number | null;

  @BelongsTo(() => Contract, "stock_id")
  declare stock: Contract;

  /** Related trade */
  @ForeignKey(() => Trade)
  @Column({ allowNull: true, field: "trade_unit_id" })
  declare trade_unit_id: number | null;

  @BelongsTo(() => Trade, "trade_unit_id")
  declare trade: Trade;
}
