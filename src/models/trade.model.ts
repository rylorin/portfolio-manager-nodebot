import { Optional } from "sequelize";
import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Table } from "sequelize-typescript";
import { Contract } from "./contract.model";
import { Portfolio } from "./portfolio.model";
import { Statement } from "./statement.model";

import { TradeStatus, TradeStrategy } from "./types";

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

  @HasMany(() => Statement, { foreignKey: "trade_unit_id" })
  declare statements: Statement[];

  get duration(): number {
    return (
      ((this.closingDate ? this.closingDate.getTime() : Date.now()) - this.openingDate.getTime()) / 1000 / 3600 / 24
    );
  }
}
