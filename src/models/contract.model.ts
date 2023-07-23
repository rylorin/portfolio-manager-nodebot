import { CreationOptional, InferAttributes, InferCreationAttributes, NonAttribute } from "sequelize";
import { AllowNull, Column, DataType, Model, Table } from "sequelize-typescript";
import { ContractType } from "./contract.types";

@Table({ tableName: "contract", timestamps: true })
export class Contract extends Model<
  InferAttributes<Contract>,
  InferCreationAttributes<
    Contract,
    { omit: "name" | "price" | "ask" | "bid" | "previousClosePrice" | "fiftyTwoWeekLow" | "fiftyTwoWeekHigh" }
  >
> {
  // id can be undefined during creation when using `autoIncrement`
  declare id: CreationOptional<number>;
  // timestamps!
  // createdAt can be undefined during creation
  declare createdAt: CreationOptional<Date>;
  // updatedAt can be undefined during creation
  declare updatedAt: CreationOptional<Date>;

  /** The unique IB contract identifier. */
  @Column({ type: DataType.INTEGER, field: "con_id" })
  declare conId: number;

  /** The asset symbol. */
  @Column({ type: DataType.STRING })
  declare symbol: string;

  /** The security type   */
  @AllowNull(false)
  @Column({ type: DataType.STRING })
  declare secType: ContractType;

  /** The destination exchange. */
  @Column({ type: DataType.STRING })
  declare exchange: string;

  /** The trading currency. */
  @Column({ type: DataType.STRING })
  declare currency: string;

  /* other fields to be documented */

  @Column({ type: DataType.STRING })
  declare name: string;

  @Column({ type: DataType.FLOAT(6, 3) })
  declare price: number | null;

  @Column({ type: DataType.FLOAT(6, 3) })
  declare bid: number | null;

  @Column({ type: DataType.FLOAT(6, 3) })
  declare ask: number | null;

  @Column({ type: DataType.FLOAT(6, 3), field: "previous_close_price" })
  declare previousClosePrice: number | null;

  get livePrice(): NonAttribute<number> {
    let value = undefined;
    if (this.getDataValue("ask") !== null && this.getDataValue("bid") !== null) {
      value = (this.getDataValue("ask") + this.getDataValue("bid")) / 2;
    } else if (this.getDataValue("price") !== null) {
      value = this.getDataValue("price");
    } else {
      value = this.getDataValue("previousClosePrice");
    }
    return Math.round(value * 1000) / 1000;
  }

  @Column({ type: DataType.FLOAT(6, 3), field: "fifty_two_week_low" })
  declare fiftyTwoWeekLow: number | null;

  @Column({ type: DataType.FLOAT(6, 3), field: "fifty_two_week_high" })
  declare fiftyTwoWeekHigh: number | null;

  // @HasMany(() => Position, { sourceKey: "id", foreignKey: "contract_id" })
  // declare positions: Position[];
}
