import { Association, CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Table } from "sequelize-typescript";
import { Balance, Contract, Currency, OpenOrder, Position, Setting, Statement } from "./";
import { CashStrategy } from "./types";

@Table({
  tableName: "portfolio",
  timestamps: true, // Include `createdAt` and `updatedAt` for audit purposes
  paranoid: false, // No `deletedAt` field since it's explicitly disabled
  comment: "Portfolio entity with trading parameters for the robot.",
})
export class Portfolio extends Model<
  InferAttributes<Portfolio>,
  InferCreationAttributes<
    Portfolio,
    {
      omit:
        | "benchmark"
        | "positions"
        | "balances"
        | "baseRates"
        | "settings"
        | "statements"
        | "orders"
        | "createdAt"
        | "updatedAt";
    }
  >
> {
  /** Auto-incrementing primary key */
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  declare id: CreationOptional<number>;

  /** Timestamp when the record was created */
  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  declare createdAt: CreationOptional<Date>;

  /** Timestamp when the record was last updated */
  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  declare updatedAt: CreationOptional<Date>;

  /** Account number */
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  declare account: string;

  /** Portfolio name */
  @Column({
    type: DataType.STRING(32),
    allowNull: false,
  })
  declare name: string;

  /** Base currency of the portfolio (e.g., USD, EUR) */
  @Column({
    type: DataType.CHAR(3),
    allowNull: false,
    validate: {
      isAlpha: true,
      isUppercase: true,
      len: [3, 3],
    },
  })
  declare baseCurrency: string;

  /** Country code of the portfolio */
  @Column({
    type: DataType.CHAR(2),
    allowNull: false,
    validate: {
      isAlpha: true,
      isUppercase: true,
      len: [2, 2],
    },
    field: "country",
  })
  declare country: string;

  /** Benchmark contract (e.g., index or ETF) */
  @ForeignKey(() => Contract)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare benchmark_id: number;

  @BelongsTo(() => Contract, "benchmark_id")
  declare benchmark: Contract;

  /** Cash strategy applied to the portfolio */
  @Column({
    type: DataType.ENUM(typeof CashStrategy),
    defaultValue: 0,
    field: "cash_strategy",
  })
  declare cashStrategy: CashStrategy;

  /** Minimum number of units for benchmark buy orders */
  @Column({
    type: DataType.INTEGER,
    defaultValue: 1,
    validate: {
      min: 1,
    },
  })
  declare minBenchmarkUnits: number;

  /** Win ratio for naked puts */
  @Column({
    type: DataType.FLOAT,
    allowNull: true,
    defaultValue: 0,
    field: "naked_put_win_ratio",
  })
  declare cspWinRatio?: number;

  /** Minimum acceptable premium */
  @Column({
    type: DataType.FLOAT,
    allowNull: true,
    defaultValue: 1,
    field: "min_premium",
  })
  declare minPremium?: number;

  /** Associations */

  @HasMany(() => Position, "portfolio_id")
  declare positions: Position[];

  @HasMany(() => Balance, "portfolio_id")
  declare balances: Balance[];

  @HasMany(() => Currency, { sourceKey: "baseCurrency", foreignKey: "base" })
  declare baseRates: Currency[];

  @HasMany(() => Setting, "portfolio_id")
  declare settings: Setting[];

  @HasMany(() => Statement, "portfolio_id")
  declare statements: Statement[];

  @HasMany(() => OpenOrder, "portfolioId")
  declare orders: OpenOrder[];

  /** Static associations for Sequelize tooling */
  declare static associations: {
    benchmark: Association<Portfolio, Contract>;
    positions: Association<Portfolio, Position>;
    balances: Association<Portfolio, Balance>;
    baseRates: Association<Portfolio, Currency>;
    settings: Association<Portfolio, Setting>;
    statements: Association<Portfolio, Statement>;
    orders: Association<Portfolio, OpenOrder>;
  };
}
