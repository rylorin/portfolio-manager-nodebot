import { CreationOptional, ForeignKey, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Contract } from "./contract.model";
import { Portfolio } from "./portfolio.model";
import { StatementTypes } from "./statement.types";
import { Trade } from "./trade.model";

// type StatementAttributes = {
//   id: number;
//   date: Date;
//   currency: string;
//   amount: number;
//   transactionID: number;
//   fxRateToBase: number;
// };

// type StatementCreationAttributes = Optional<StatementAttributes, 'id'>;

// @Table({ tableName: 'statement', timestamps: false, createdAt: false, updatedAt: false })
// export class Statement extends Model<StatementAttributes, StatementCreationAttributes> {
//   declare id: number;
//   declare date: Date;
//   declare currency: string;
//   declare amount: number;
//   declare transactionID: number;
//   declare fxRateToBase: number;
//   /** portfolio */
//   @BelongsTo(() => Portfolio, 'portfolio_id')
//   portfolio!: Portfolio;
//   /** contract */
//   @BelongsTo(() => Contract, 'stock_id')
//   contract: Contract;
// }

@Table({ tableName: "statement", timestamps: true })
export class Statement extends Model<
  InferAttributes<Statement>,
  InferCreationAttributes<Statement, { omit: "stock" | "portfolio" | "trade" }>
> {
  // id can be undefined during creation when using `autoIncrement`
  declare id: CreationOptional<number>;
  // timestamps!
  // createdAt can be undefined during creation
  declare createdAt: CreationOptional<Date>;
  // updatedAt can be undefined during creation
  declare updatedAt: CreationOptional<Date>;

  /** Portfolio */
  // @ForeignKey(() => Portfolio)
  // @Column
  declare portfolio_id: ForeignKey<Portfolio["id"]>;
  @BelongsTo(() => Portfolio, "portfolio_id")
  declare portfolio: Portfolio;

  @Column({ type: DataType.ENUM(typeof StatementTypes), field: "statement_type" })
  declare statementType: StatementTypes;

  @Column({ type: DataType.DATE, field: "date" })
  declare date: Date;

  @Column({ type: DataType.STRING(3), field: "currency" })
  declare currency: string;

  @Column({ type: DataType.FLOAT, field: "amount" })
  declare amount: number;

  @Column({ type: DataType.STRING })
  declare description: string;

  @Column({ type: DataType.INTEGER, field: "transaction_id" })
  declare transactionId: number;

  @Column({ type: DataType.FLOAT, field: "fx_rate_to_base" })
  declare fxRateToBase: number;

  /** Related underlying */
  declare stock_id: ForeignKey<Contract["id"]>;
  @BelongsTo(() => Contract, "stock_id")
  declare stock: Contract;

  /** Trade */
  declare trade_unit_id: ForeignKey<Trade["id"]> | null;
  @BelongsTo(() => Trade, "trade_unit_id")
  declare trade: Trade;
}
