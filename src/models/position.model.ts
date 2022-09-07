import {
  Model,
  Table,
  Column,
  DataType,
  BelongsTo,
} from "sequelize-typescript";
import { Contract, Portfolio, Trade } from ".";

@Table({ tableName: "position", timestamps: true })
export class Position extends Model {

  /** contract */
  @BelongsTo(() => Contract, "contract_id")
  public contract!: Contract;

  /** portfolio */
  @BelongsTo(() => Portfolio, "portfolio_id")
  public portfolio!: Portfolio;

  /** cost basis */
  @Column({ type: DataType.FLOAT })
  public cost: number;

  /** quantity */
  @Column({ type: DataType.FLOAT })
  public quantity: number;

  get averagePrice(): number {
    return (this.getDataValue("cost") / this.getDataValue("quantity"));
  }

  /** trade */
  @BelongsTo(() => Trade, "trade_unit_id")
  public trade: Trade;

}