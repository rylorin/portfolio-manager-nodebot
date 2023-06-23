import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import { Contract, Portfolio, Trade } from ".";

@Table({ tableName: "position", timestamps: true })
export class Position extends Model {
  /** Related Contract */
  @ForeignKey(() => Contract)
  @Column
  declare contract_id: number;
  @BelongsTo(() => Contract, "contract_id")
  declare contract: Contract;

  /** Portfolio */
  @ForeignKey(() => Portfolio)
  @Column
  declare portfolio_id: number;
  @BelongsTo(() => Portfolio, "portfolio_id")
  declare portfolio: Portfolio;

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
