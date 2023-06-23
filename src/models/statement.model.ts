import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import { Contract, Portfolio, Trade } from ".";

export const StatementTypes = {
  EquityStatement: "Trade",
  OptionStatement: "TradeOption",
  DividendStatement: "Dividend",
  TaxStatement: "Tax",
  InterestStatement: "Interest",
  FeeStatement: "OtherFee",
  CorporateStatement: "CorporateStatement",
  CashStatement: "Cash",
} as const;
export type StatementTypes = (typeof StatementTypes)[keyof typeof StatementTypes];

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

@Table({ tableName: "statement", timestamps: false, createdAt: false, updatedAt: false })
export class Statement extends Model {
  declare id: number;

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

  /** Portfolio */
  @ForeignKey(() => Portfolio)
  @Column
  declare portfolio_id: number;
  @BelongsTo(() => Portfolio, "portfolio_id")
  declare portfolio: Portfolio;

  /** Related underlying */
  @ForeignKey(() => Contract)
  @Column
  declare stock_id?: number;
  @BelongsTo(() => Contract, "stock_id")
  declare stock: Contract;

  /** Trade */
  @ForeignKey(() => Trade)
  @Column
  declare trade_unit_id?: number;
  @BelongsTo(() => Trade, "trade_unit_id")
  declare trade: Trade;
}
