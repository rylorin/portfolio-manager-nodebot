import {
  Model,
  Table,
  Column,
  DataType,
  BelongsTo,
} from "sequelize-typescript";
import { Contract } from ".";

@Table({ tableName: "portfolio", timestamps: false, deletedAt: false, updatedAt: false })
export class Portfolio extends Model {

  /** The account number. */
  @Column({ type: DataType.STRING })
  public account!: string;

  /** The benchmark symbol. */
  @BelongsTo(() => Contract, "benchmark_id")
  public benchmark?: Contract;

  @Column({ type: DataType.STRING(3), field: "base_currency" })
  public baseCurrency: string;

  @Column({ type: DataType.FLOAT, field: "put_ratio" })
  public putRatio: number;

  @Column({ type: DataType.FLOAT, field: "naked_put_win_ratio" })
  public cspWinRatio: number;

  @Column({ type: DataType.FLOAT, field: "naked_call_win_ratio" })
  public ccWinRatio: number;

  @Column({ type: DataType.FLOAT, field: "min_premium" })
  public minPremium: number;

  @Column({ type: DataType.FLOAT, field: "cash_strategy" })
  public cashStrategy: number;

}