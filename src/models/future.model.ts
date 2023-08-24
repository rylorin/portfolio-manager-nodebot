import { CreationOptional, ForeignKey, InferAttributes, InferCreationAttributes, NonAttribute } from "sequelize";
import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Contract } from "./contract.model";

@Table({ tableName: "future", timestamps: true, deletedAt: false })
export class Future extends Model<
  InferAttributes<Future>,
  InferCreationAttributes<Future, { omit: "contract" | "underlying" }>
> {
  // id can be undefined during creation when using `autoIncrement`
  declare id: CreationOptional<number>;
  // timestamps!
  // createdAt can be undefined during creation
  declare createdAt: CreationOptional<Date>;
  // updatedAt can be undefined during creation
  declare updatedAt: CreationOptional<Date>;

  @BelongsTo(() => Contract, "id")
  declare contract: Contract;

  /** Underlying */
  declare underlying_id: ForeignKey<Contract["id"]> | null;
  @BelongsTo(() => Contract, "underlying_id")
  declare underlying: Contract;

  /**
   * last tradable date as YYYY-MM-DD formated string
   */
  @Column({ type: DataType.DATEONLY, field: "last_trade_date" })
  declare lastTradeDate: string; // YYYY-MM-DD

  /**
   * Get last tradable date as Date type
   */
  get expiryDate(): NonAttribute<Date> {
    return new Date(this.getDataValue("lastTradeDate"));
  }

  /**
   * Get last tradable date as number type
   */
  get expiry(): NonAttribute<number> {
    // Format date to YYYYMMDD
    return parseInt((this.getDataValue("lastTradeDate") as unknown as string).substring(0, 10).replaceAll("-", ""));
  }

  /**
   * Get number of day till expiration, with a minimum of 1 day (for 0DTE).
   * Not compatible with past expirations (because of min of 1 day)
   */
  get dte(): NonAttribute<number> {
    const dte: number = Math.max(
      (new Date(this.getDataValue("lastTradeDate")).getTime() - Date.now()) / 1000 / 86400,
      1,
    );
    return dte;
  }

  @Column({ type: DataType.INTEGER, defaultValue: 100 })
  declare multiplier: number;
}
