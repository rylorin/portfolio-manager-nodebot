import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Table } from "sequelize-typescript";
import { Balance, Contract, Currency, Position } from ".";

@Table({ tableName: "portfolio", timestamps: false, deletedAt: false, updatedAt: false })
export class Portfolio extends Model {
  declare id: number;

  /** The account number. */
  @Column({ type: DataType.STRING })
  declare account: string;

  /** The benchmark symbol. */
  @ForeignKey(() => Contract)
  @Column
  declare benchmark_id: number;
  @BelongsTo(() => Contract, "benchmark_id")
  declare benchmark: Contract;

  @Column({ type: DataType.STRING(32), field: "name" })
  declare name: string;

  @Column({ type: DataType.STRING(3), field: "base_currency" })
  declare baseCurrency: string;

  @Column({ type: DataType.FLOAT, field: "put_ratio" })
  declare putRatio: number;

  @Column({ type: DataType.FLOAT, field: "naked_put_win_ratio" })
  declare cspWinRatio: number;

  @Column({ type: DataType.FLOAT, field: "naked_call_win_ratio" })
  declare ccWinRatio: number;

  @Column({ type: DataType.FLOAT, field: "min_premium" })
  declare minPremium: number;

  @Column({ type: DataType.FLOAT, field: "cash_strategy" })
  declare cashStrategy: number;

  @HasMany(() => Position, "portfolio_id")
  declare positions: Position[];

  @HasMany(() => Balance, "portfolio_id")
  declare balances: Balance[];

  @HasMany(() => Currency, { sourceKey: "baseCurrency", foreignKey: "base" })
  declare baseRates: Currency[];
}
