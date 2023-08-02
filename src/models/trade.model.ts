import { CreationOptional, ForeignKey, InferAttributes, InferCreationAttributes, NonAttribute } from "sequelize";
import { BelongsTo, Column, DataType, HasMany, Model, Table } from "sequelize-typescript";
import { Contract } from "./contract.model";
import { expirationToDate } from "./date_utils";
import { Portfolio } from "./portfolio.model";
import { Position } from "./position.model";
import { Statement } from "./statement.model";
import { TradeStatus, TradeStrategy } from "./trade.types";

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
  declare portfolio_id: ForeignKey<Portfolio["id"]>;
  @BelongsTo(() => Portfolio, "portfolio_id")
  declare portfolio: Portfolio;

  /** Related Stock */
  declare symbol_id: ForeignKey<Contract["id"]>;
  @BelongsTo(() => Contract, "symbol_id")
  declare underlying: Contract;

  @Column({ type: DataType.SMALLINT })
  declare status: TradeStatus;

  @Column({ type: DataType.DATE, field: "opening_date" })
  declare openingDate: Date;

  @Column({ type: DataType.DATE, field: "closing_date" })
  declare closingDate?: Date;

  /** expected expiration date */
  @Column({ type: DataType.DATEONLY, field: "expiryDate" })
  declare expectedExpiry?: string | null; // YYYY-MM-DD

  @Column({ type: DataType.SMALLINT, defaultValue: 0 })
  declare strategy: TradeStrategy;

  @Column({ type: DataType.FLOAT, field: "pn_l" })
  declare PnL?: number;

  @Column
  declare pnlInBase?: number;

  @Column({ type: DataType.STRING(3) })
  declare currency: string;

  /** Risk of this trade. A negative number represents the risk of loss of this trade */
  @Column({ type: DataType.FLOAT })
  declare risk?: number;

  @Column({ type: DataType.STRING, defaultValue: "" })
  declare comment: string;

  @HasMany(() => Statement, { foreignKey: "trade_unit_id" })
  declare statements?: Statement[];

  /** Total duration if trade is closed or current duration is trade is open */
  get duration(): NonAttribute<number> {
    return (
      ((this.closingDate ? this.closingDate.getTime() : Date.now()) - this.openingDate.getTime()) / 1000 / 3600 / 24
    );
  }

  get expectedDuration(): NonAttribute<number | undefined> {
    return this.closingDate
      ? (this.closingDate.getTime() - this.openingDate.getTime()) / 1000 / 3600 / 24
      : Math.max(
          (expirationToDate(this.expectedExpiry).getTime() - this.openingDate.getTime()) / 1000 / 3600 / 24 + 0.6,
          0,
        );
  }

  /** Related positions */
  @HasMany(() => Position, "trade_unit_id")
  declare positions?: Position[];
}
