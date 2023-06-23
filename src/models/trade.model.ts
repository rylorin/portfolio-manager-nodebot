import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import { Contract, Portfolio } from ".";

export const TradeStatus = {
  undefined: 0,
  open: 1,
  closed: 2,
} as const;
export type TradeStatus = (typeof TradeStatus)[keyof typeof TradeStatus];

export const TradeStrategy = {
  undefined: 0,
  "long stock": 1,
  "short stock": 2,
  "buy write": 3,
  "long call": 4,
  "naked short call": 5,
  "covered short call": 6,
  "long put": 7,
  "short put": 8,
  "the wheel": 9,
  "risk reversal": 10,
  "bull spread": 11,
  "bear spread": 12,
  "front ratio spread": 13,
  "short strangle": 14,
  "long strangle": 15,
  "long straddle": 16,
  "short straddle": 17,
  "iron condor": 18,
  "short iron condor": 19,
} as const;
export type TradeStrategy = (typeof TradeStrategy)[keyof typeof TradeStrategy];

@Table({ tableName: "trade_unit", timestamps: false })
export class Trade extends Model {
  declare id: number;

  /** Related Stock */
  @ForeignKey(() => Contract)
  @Column
  declare symbol_id: number;
  @BelongsTo(() => Contract, "symbol_id")
  declare stock: Contract;

  /** Portfolio */
  @ForeignKey(() => Portfolio)
  @Column
  declare portfolio_id: number;
  @BelongsTo(() => Portfolio, "portfolio_id")
  declare portfolio: Portfolio;

  @Column({ type: DataType.SMALLINT })
  declare strategy: TradeStrategy;

  @Column({ type: DataType.DATE, field: "opening_date" })
  declare openingDate: Date;

  @Column({ type: DataType.DATE, field: "closing_date" })
  declare closingDate?: Date;

  @Column({ type: DataType.SMALLINT })
  declare status: TradeStatus;

  @Column({ type: DataType.FLOAT, field: "pn_l" })
  declare PnL?: number;

  @Column({ type: DataType.STRING(3) })
  declare currency: string;

  @Column({ type: DataType.FLOAT })
  declare risk?: number;

  @Column({ type: DataType.STRING })
  declare comment?: string;
}
