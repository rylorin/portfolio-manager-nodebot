import { CreationOptional, type ForeignKey, InferAttributes, InferCreationAttributes, NonAttribute } from "sequelize";
import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Contract } from "./contract.model";

@Table({
  tableName: "stock_contract",
  timestamps: true,
  deletedAt: false,
})
export class StockContract extends Model<
  InferAttributes<StockContract>,
  InferCreationAttributes<StockContract, { omit: "contract" }>
> {
  /** Primary key (inherited from `Contract`) */
  @Column({ type: DataType.INTEGER, allowNull: false, primaryKey: true, unique: true })
  declare id: ForeignKey<Contract["id"]>;

  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  /** Base contract associated with this stock */
  @BelongsTo(() => Contract, "id")
  declare contract: Contract;

  /** Historical volatility of the stock */
  @Column({ type: DataType.FLOAT, field: "historical_volatility" })
  declare historicalVolatility?: number;

  /** Earnings per share (trailing twelve months) */
  @Column({ type: DataType.FLOAT, field: "eps_ttm" })
  declare epsTrailingTwelveMonths?: number;

  /** Earnings per share (forward estimate) */
  @Column({ type: DataType.FLOAT, field: "eps_forward" })
  declare epsForward?: number;

  /** Trailing annual dividend rate */
  @Column({ type: DataType.FLOAT, field: "dividend_ttm" })
  declare trailingAnnualDividendRate?: number;

  /** Industry classification of the stock */
  @Column({ type: DataType.STRING })
  declare industry: string;

  /** Category or sector of the stock */
  @Column({ type: DataType.STRING })
  declare category: string;

  /** Subcategory or detailed classification */
  @Column({ type: DataType.STRING })
  declare subcategory: string;

  /**
   * Calculate the price-to-earnings (P/E) ratio based on TTM EPS.
   * Returns `null` if EPS TTM or price is unavailable.
   */
  get peRatio(): NonAttribute<number | null> {
    const price = this.contract?.price;
    const eps = this.epsTrailingTwelveMonths;
    return price && eps ? price / eps : null;
  }

  /**
   * Calculate the dividend yield based on trailing annual dividend rate.
   * Returns `null` if dividend rate or price is unavailable.
   */
  get dividendYield(): NonAttribute<number | null> {
    const price = this.contract?.price;
    const dividend = this.trailingAnnualDividendRate;
    return price && dividend ? (dividend / price) * 100 : null;
  }

  /**
   * Get a formatted industry classification.
   * Combines category, industry, and subcategory for better readability.
   */
  get formattedClassification(): NonAttribute<string> {
    return `${this.category || "Unknown"} > ${this.industry || "Unknown"} > ${this.subcategory || "Unknown"}`;
  }
}
