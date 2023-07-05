import { Optional } from "sequelize";
import { AllowNull, Column, DataType, Model, Table } from "sequelize-typescript";
import { ContractType } from "./contract.types";

export type ContractAttributes = {
  id: number;

  conId: number;
  symbol: string;
  secType: ContractType;
  exchange: string;
  currency: string;
  name: string;
  price: number;
  bid: number;
  ask: number;
  previousClosePrice: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
};

export type ContractCreationAttributes = Optional<ContractAttributes, "id">;

@Table({ tableName: "contract", timestamps: true })
export class Contract extends Model<ContractAttributes, ContractCreationAttributes> {
  declare id: number;

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
  declare price: number;

  @Column({ type: DataType.FLOAT(6, 3) })
  declare bid: number;

  @Column({ type: DataType.FLOAT(6, 3) })
  declare ask: number;

  @Column({ type: DataType.FLOAT(6, 3), field: "previous_close_price" })
  declare previousClosePrice: number;

  get livePrice(): number {
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
  declare fiftyTwoWeekLow?: number;

  @Column({ type: DataType.FLOAT(6, 3), field: "fifty_two_week_high" })
  declare fiftyTwoWeekHigh?: number;
}
