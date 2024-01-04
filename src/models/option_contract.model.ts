import { OptionType } from "@stoqey/ib";
import { CreationOptional, ForeignKey, InferAttributes, InferCreationAttributes, NonAttribute } from "sequelize";
import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Contract } from "./contract.model";

// @DefaultScope(() => ({
//   include: [{association:'contract'}]
// }))
@Table({ tableName: "option_contract", timestamps: true, deletedAt: false })
export class OptionContract extends Model<
  InferAttributes<OptionContract>,
  InferCreationAttributes<OptionContract, { omit: "contract" | "stock" }>
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
  declare stock_id: ForeignKey<Contract["id"]>;
  @BelongsTo(() => Contract, "stock_id")
  declare stock: Contract;

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

  @Column({ type: DataType.FLOAT })
  declare strike: number;

  @Column({ type: DataType.ENUM("C", "P"), field: "call_or_put" })
  declare callOrPut: OptionType;

  @Column({ type: DataType.INTEGER, defaultValue: 100 })
  declare multiplier: number;

  @Column({ type: DataType.FLOAT(3, 5), field: "implied_volatility" })
  declare impliedVolatility: number | null;

  @Column({ type: DataType.FLOAT, field: "pv_dividend", defaultValue: 0 })
  declare pvDividend: number | null;

  @Column({ type: DataType.FLOAT(1, 4) })
  declare delta: number | null;

  @Column({ type: DataType.FLOAT })
  declare gamma: number | null;

  @Column({ type: DataType.FLOAT })
  declare vega: number | null;

  @Column({ type: DataType.FLOAT })
  declare theta: number | null;
}
