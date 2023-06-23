import { SecType as IbSecType } from "@stoqey/ib";
import { AllowNull, Column, DataType, Model, Table } from "sequelize-typescript";

export const ContracType = {
  Stock: "STK",
  Option: "OPT",
  Bag: "BAG",
  Cash: "CASH",
  Future: "FUT",
  FutureOption: "FOP", // maybe OPT
  Index: "IND",
} as const;
export type ContracType = (typeof ContracType)[keyof typeof ContracType];

@Table({ tableName: "contract", timestamps: true })
export class Contract extends Model {
  /** The unique IB contract identifier. */
  @Column({ type: DataType.INTEGER, field: "con_id" })
  declare conId: number;

  /** The asset symbol. */
  @Column({ type: DataType.STRING })
  declare symbol: string;

  /** The security type   */
  @AllowNull(false)
  @Column({ type: DataType.ENUM(typeof ContracType) })
  declare secType: IbSecType;

  /** The destination exchange. */
  @Column({ type: DataType.STRING })
  declare exchange: string;

  /** The trading currency. */
  @Column({ type: DataType.STRING(3) })
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
      value = ((this.getDataValue("ask") as number) + (this.getDataValue("bid") as number)) / 2;
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
