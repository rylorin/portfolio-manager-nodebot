import { CreationOptional, ForeignKey, InferAttributes, InferCreationAttributes, NonAttribute } from "sequelize";
import { BelongsTo, Column, DataType, HasMany, Model, Table } from "sequelize-typescript";
import { Contract } from "./contract.model";
import { Portfolio } from "./portfolio.model";
import { Position } from "./position.model";
import { Statement } from "./statement.model";
import { TradeStatus, TradeStrategy } from "./trade.types";

// export type TradeAttributes = {
//   id: number;

//   portfolio_id: number;
//   symbol_id?: number;

//   strategy: TradeStrategy;
//   openingDate: Date;
//   closingDate?: Date;
//   status: TradeStatus;
//   PnL?: number;
//   currency: string;
//   risk?: number;
//   comment?: string;
// };

// export type TradeCreationAttributes = Optional<TradeAttributes, "id">;

@Table({ tableName: "trade_unit", timestamps: true })
export class Trade extends Model<
  InferAttributes<Trade>,
  InferCreationAttributes<Trade, { omit: "portfolio" | "underlying" }>
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

  /** Related Stock */
  // @ForeignKey(() => Contract)
  // @Column
  declare symbol_id: ForeignKey<Contract["id"]>;
  @BelongsTo(() => Contract, "symbol_id")
  declare underlying: Contract;

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

  @Column
  declare pnlInBase?: number;

  @Column({ type: DataType.STRING(3) })
  declare currency: string;

  @Column({ type: DataType.FLOAT })
  declare risk?: number;

  @Column({ type: DataType.STRING, defaultValue: "" })
  declare comment: string;

  @HasMany(() => Statement, { foreignKey: "trade_unit_id" })
  declare statements?: Statement[];

  get duration(): NonAttribute<number> {
    return (
      ((this.closingDate ? this.closingDate.getTime() : Date.now()) - this.openingDate.getTime()) / 1000 / 3600 / 24
    );
  }

  /** Related positions */
  @HasMany(() => Position, "trade_unit_id")
  declare positions?: Position[];
}
