import { Optional } from "sequelize";
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import { Contract } from "./contract.model";
import { Portfolio } from "./portfolio.model";
import { Trade } from "./trade.model";

export type PositionAttributes = {
  id: number;

  portfolio_id: number;
  contract_id: number;
  trade_unit_id?: number;

  cost: number;
  quantity: number;
  createdAt: Date;
};

export type PositionCreationAttributes = Optional<PositionAttributes, "id" | "createdAt">;

@Table({ tableName: "position", timestamps: true })
export class Position extends Model<PositionAttributes, PositionCreationAttributes> {
  declare id: number;

  /** Portfolio */
  @ForeignKey(() => Portfolio)
  @Column
  declare portfolio_id: number;
  @BelongsTo(() => Portfolio, "portfolio_id")
  declare portfolio: Portfolio;

  /** Related Contract */
  @ForeignKey(() => Contract)
  @Column
  declare contract_id: number;
  @BelongsTo(() => Contract, "contract_id")
  declare contract: Contract;

  /** cost basis */
  @Column({ type: DataType.FLOAT })
  declare cost: number;

  /** quantity */
  @Column({ type: DataType.FLOAT })
  declare quantity: number;

  get averagePrice(): number {
    return this.getDataValue("cost") / this.getDataValue("quantity");
  }

  /** trade */
  @BelongsTo(() => Trade, "trade_unit_id")
  declare trade: Trade;
  declare trade_unit_id: number;
}
