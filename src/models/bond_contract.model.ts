import {
  type CreationOptional,
  type ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  NonAttribute,
} from "sequelize";
import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Contract } from "./contract.model";

@Table({
  tableName: "bond_contract",
  timestamps: true,
  deletedAt: false,
})
export class BondContract extends Model<
  InferAttributes<BondContract>,
  InferCreationAttributes<BondContract, { omit: "contract" | "underlying" }>
> {
  /** Primary key (inherited from `Contract`) */
  @Column({ type: DataType.INTEGER, allowNull: false, primaryKey: true, unique: true })
  declare id: ForeignKey<Contract["id"]>;

  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  /** Base contract associated with this bond */
  @BelongsTo(() => Contract, "id")
  declare contract: Contract;

  /** Underlying asset */
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: "underlying_id",
  })
  declare underlying_id: ForeignKey<Contract["id"]>;

  @BelongsTo(() => Contract, "underlying_id")
  declare underlying: Contract | null;

  /** Country code (ISO 3166-1 alpha-2 format, optional) */
  @Column({
    type: DataType.STRING(2),
    allowNull: true,
    validate: {
      is: /^[A-Z]{2}$/, // Validates ISO 3166-1 alpha-2 format
    },
  })
  declare country?: string;

  /** Expiration date in YYYY-MM-DD format, nullable for perpetual bonds */
  @Column({
    type: DataType.DATEONLY,
    allowNull: true,
    field: "last_trade_date",
    validate: {
      isDate: true,
    },
  })
  declare lastTradeDate: string | null;

  /** Get expiration date as a `Date` object, or null if not applicable */
  get expiryDate(): NonAttribute<Date | null> {
    const lastTradeDate = this.getDataValue("lastTradeDate");
    return lastTradeDate ? new Date(lastTradeDate) : null;
  }

  /** Get expiration date as a number in YYYYMMDD format, or `null` if not applicable */
  get expiry(): NonAttribute<number | null> {
    const lastTradeDate = this.getDataValue("lastTradeDate");
    return lastTradeDate ? parseInt(lastTradeDate.replaceAll("-", "")) : null;
  }

  /**
   * Days to expiration (DTE)
   * - Returns a positive integer representing the number of days until expiration.
   * - For perpetual bonds or expired contracts, returns `null`.
   */
  get dte(): NonAttribute<number | null> {
    const lastTradeDate = this.getDataValue("lastTradeDate");
    if (!lastTradeDate) return null; // Perpetual bond or undefined expiration
    const now = new Date().setHours(0, 0, 0, 0); // Normalize to midnight
    const expiry = new Date(lastTradeDate).getTime();
    const days = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return Math.max(days, 0); // Return 0 if already expired
  }

  /** Multiplier for the bond contract (default: 1) */
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1,
    },
  })
  declare multiplier: number;
}
