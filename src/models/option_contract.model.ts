import { OptionType } from "@stoqey/ib";
import { CreationOptional, ForeignKey, InferAttributes, InferCreationAttributes, NonAttribute } from "sequelize";
import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Contract } from "./contract.model";

@Table({ tableName: "option_contract", timestamps: true, deletedAt: false })
export class OptionContract extends Model<
  InferAttributes<OptionContract>,
  InferCreationAttributes<OptionContract, { omit: "contract" | "stock" }>
> {
  // Primary key
  declare id: CreationOptional<number>;

  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  /** Base contract associated with this option */
  @BelongsTo(() => Contract, "id")
  declare contract: Contract;

  /** Underlying stock contract */
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare stock_id: ForeignKey<Contract["id"]>;
  @BelongsTo(() => Contract, "stock_id")
  declare stock: Contract;

  /** Last tradable date in YYYY-MM-DD format */
  @Column({
    type: DataType.DATEONLY,
    field: "last_trade_date",
    allowNull: false,
    validate: { isDate: true },
  })
  declare lastTradeDate: string; // YYYY-MM-DD

  /** Returns the expiry date as a `Date` object */
  get expiryDate(): NonAttribute<Date> {
    return new Date(this.lastTradeDate);
  }

  /** Returns the expiry date in numeric format (YYYYMMDD) */
  get expiry(): NonAttribute<number> {
    return parseInt(this.lastTradeDate.substring(0, 10).replaceAll("-", ""), 10);
  }

  /** Days to expiration (DTE) */
  get dte(): NonAttribute<number> {
    const daysUntilExpiry = Math.ceil((new Date(this.lastTradeDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(daysUntilExpiry, 1); // Minimum 1 day for 0DTE
  }

  /** Strike price of the option */
  @Column({ type: DataType.FLOAT, allowNull: false, validate: { min: 0 } })
  declare strike: number;

  /** Call or Put option */
  @Column({
    type: DataType.ENUM("C", "P"),
    field: "call_or_put",
    allowNull: false,
  })
  declare callOrPut: OptionType;

  /** Option multiplier (default: 100) */
  @Column({ type: DataType.INTEGER, defaultValue: 100, validate: { min: 1 } })
  declare multiplier: number;

  /** Implied volatility (optional) */
  @Column({
    type: DataType.FLOAT(3, 5),
    field: "implied_volatility",
    validate: { min: 0, max: 1 },
  })
  declare impliedVolatility: number | null;

  /** Present value of dividends */
  @Column({ type: DataType.FLOAT, field: "pv_dividend", defaultValue: 0 })
  declare pvDividend: number | null;

  /** Greeks */
  @Column({ type: DataType.FLOAT(1, 4), validate: { min: -1.0, max: 1.0 } })
  declare delta: number | null;

  @Column({ type: DataType.FLOAT, validate: { min: 0 } })
  declare gamma: number | null;

  @Column({ type: DataType.FLOAT, validate: { min: 0 } })
  declare vega: number | null;

  @Column({ type: DataType.FLOAT, validate: { min: 0 } })
  declare theta: number | null;
}
