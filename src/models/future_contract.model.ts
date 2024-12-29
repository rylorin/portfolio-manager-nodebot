import { CreationOptional, ForeignKey, InferAttributes, InferCreationAttributes, NonAttribute } from "sequelize";
import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Contract } from "./contract.model";

@Table({
  tableName: "future_contract",
  timestamps: true,
  deletedAt: false,
})
export class FutureContract extends Model<
  InferAttributes<FutureContract>,
  InferCreationAttributes<FutureContract, { omit: "contract" | "underlying" }>
> {
  // Primary key
  declare id: number;

  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  /** Base contract associated with this future */
  @BelongsTo(() => Contract, "id")
  declare contract: Contract;

  /** Underlying asset (optional, can be null) */
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    field: "underlying_id",
  })
  declare underlying_id: ForeignKey<Contract["id"]> | null;

  @BelongsTo(() => Contract, "underlying_id")
  declare underlying: Contract | null;

  /** Expiration date in YYYY-MM-DD format */
  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
    field: "last_trade_date",
    validate: { isDate: true },
  })
  declare lastTradeDate: string;

  /** Get expiration date as a `Date` object */
  get expiryDate(): NonAttribute<Date> {
    return new Date(this.lastTradeDate);
  }

  /** Get expiration date as a number in YYYYMMDD format */
  get expiry(): NonAttribute<number> {
    return parseInt(this.lastTradeDate.substring(0, 10).replaceAll("-", ""));
  }

  /**
   * Days to expiration (DTE)
   * - Returns a positive integer representing the number of days until expiration.
   * - For expired contracts, returns 0.
   */
  get dte(): NonAttribute<number> {
    const now = new Date().setHours(0, 0, 0, 0); // Normalize to midnight
    const expiry = new Date(this.lastTradeDate).getTime();
    const days = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return Math.max(days, 0);
  }

  /** Multiplier for the contract */
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 100,
    validate: { min: 1 },
  })
  declare multiplier: number;
}
