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
  // @ForeignKey(() => Contract)
  // @Column
  // declare underlying_id: number;
  declare underlying_id: ForeignKey<Contract["id"]> | null;
  @BelongsTo(() => Contract, "underlying_id")
  declare underlying: Contract;

  @Column({ type: DataType.DATEONLY, field: "last_trade_date" })
  get lastTradeDate(): Date {
    return new Date(this.getDataValue("lastTradeDate"));
  }
  set lastTradeDate(value: Date | string) {
    if (value instanceof Date) {
      this.setDataValue("lastTradeDate", value);
    } else if (typeof value == "string") {
      // Format date to YYYY-MM-DD
      this.setDataValue("lastTradeDate", new Date(value.substring(0, 10)));
    }
  }

  get expiry(): NonAttribute<number> {
    // Format date to YYYYMMDD
    return parseInt((this.getDataValue("lastTradeDate") as unknown as string).substring(0, 10).replaceAll("-", ""));
  }

  @Column({ type: DataType.INTEGER, defaultValue: 100 })
  declare multiplier: number;

  get dte(): NonAttribute<number> {
    const dte: number = Math.max(
      (new Date(this.getDataValue("lastTradeDate")).getTime() - Date.now()) / 1000 / 86400,
      1,
    );
    return dte;
  }
}
