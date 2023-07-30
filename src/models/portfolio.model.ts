import { CreationOptional, ForeignKey, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, HasMany, Model, Table } from "sequelize-typescript";
import { Balance } from "./balance.model";
import { Contract } from "./contract.model";
import { Currency } from "./currency.model";
import { CashStrategy } from "./portfolio.types";
import { Position } from "./position.model";
import { Setting } from "./setting.model";

@Table({ tableName: "portfolio", timestamps: false, deletedAt: false, updatedAt: false })
export class Portfolio extends Model<
  InferAttributes<Portfolio>,
  InferCreationAttributes<Portfolio, { omit: "benchmark" }>
> {
  // id can be undefined during creation when using `autoIncrement`
  declare id: CreationOptional<number>;
  // timestamps!
  // createdAt can be undefined during creation
  declare createdAt: CreationOptional<Date>;
  // updatedAt can be undefined during creation
  declare updatedAt: CreationOptional<Date>;

  /** The account number. */
  @Column({ type: DataType.STRING })
  declare account: string;

  /** The benchmark symbol. */
  declare benchmark_id: ForeignKey<Contract["id"]>;
  @BelongsTo(() => Contract, "benchmark_id")
  declare benchmark: Contract;

  @Column({ type: DataType.STRING(32), field: "name" })
  declare name: string;

  @Column({ type: DataType.STRING(3), field: "base_currency" })
  declare baseCurrency: string;

  @Column({ type: DataType.FLOAT, field: "put_ratio", defaultValue: 0 })
  declare putRatio?: number;

  @Column({ type: DataType.FLOAT, field: "naked_put_win_ratio", defaultValue: 0 })
  declare cspWinRatio?: number;

  @Column({ type: DataType.FLOAT, field: "naked_call_win_ratio", defaultValue: 0 })
  declare ccWinRatio?: number;

  @Column({ type: DataType.FLOAT, field: "min_premium", defaultValue: 0.25 })
  declare minPremium?: number;

  @Column({ type: DataType.INTEGER, field: "roll_Days_Before", defaultValue: 6 })
  declare rollDaysBefore?: number;

  @Column({ type: DataType.SMALLINT, field: "cash_strategy", defaultValue: 0 })
  declare cashStrategy?: CashStrategy;

  @Column({ type: DataType.INTEGER, field: "sell_Naked_Put_Sleep" })
  declare sellNakedPutSleep: number;

  @Column({ type: DataType.INTEGER, field: "find_Symbols_Sleep" })
  declare findSymbolsSleep: number;

  @Column({ type: DataType.INTEGER, field: "adjust_Cash_Sleep" })
  declare adjustCashSleep: number;

  @Column({ type: DataType.INTEGER, field: "roll_Options_Sleep" })
  declare rollOptionsSleep: number;

  @Column({ type: DataType.INTEGER, field: "crawler_Days", defaultValue: 90 })
  declare crawlerDays?: number;

  @HasMany(() => Position, "portfolio_id")
  declare positions: Position[];

  @HasMany(() => Balance, "portfolio_id")
  declare balances: Balance[];

  @HasMany(() => Currency, { sourceKey: "baseCurrency", foreignKey: "base" })
  declare baseRates: Currency[];

  @HasMany(() => Setting, "portfolio_id")
  declare settings: Setting[];
}
