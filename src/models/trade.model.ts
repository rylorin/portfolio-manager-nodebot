import { Optional } from "sequelize";
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

export type TradeAttributes = {
  id: number;

  portfolio_id: number;
  symbol_id?: number;

  strategy: TradeStrategy;
  openingDate: Date;
  closingDate?: Date;
  status: TradeStatus;
  PnL?: number;
  currency: string;
  risk?: number;
  comment?: string;
};

export type TradeCreationAttributes = Optional<TradeAttributes, "id">;

@Table({ tableName: "trade_unit", timestamps: true })
export class Trade extends Model<TradeAttributes, TradeCreationAttributes> {
  declare id: number;

  /** Portfolio */
  @ForeignKey(() => Portfolio)
  @Column
  declare portfolio_id: number;
  @BelongsTo(() => Portfolio, "portfolio_id")
  declare portfolio: Portfolio;

  /** Related Stock */
  @ForeignKey(() => Contract)
  @Column
  declare symbol_id: number;
  @BelongsTo(() => Contract, "symbol_id")
  declare stock: Contract;

  @Column({ type: DataType.SMALLINT, defaultValue: 0 })
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
