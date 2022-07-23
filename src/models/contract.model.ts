import {
  Model,
  Table,
  Column,
  DataType,
} from "sequelize-typescript";
import { SecType } from "@stoqey/ib";

@Table({ tableName: "contract", timestamps: true })
export class Contract extends Model {

  /** The unique IB contract identifier. */
  @Column({ type: DataType.INTEGER, field: "con_id" })
  public conId: number;

  /** The asset symbol. */
  @Column({ type: DataType.STRING })
  public symbol!: string;

  /** The security type   */
  @Column({ type: DataType.ENUM("STK", "OPT", "BAG", "CASH") })
  public secType!: SecType;

  /** The destination exchange. */
  @Column({ type: DataType.STRING })
  public exchange: string;

  /** The trading currency. */
  @Column({ type: DataType.STRING(3) })
  public currency: string;

  /* other fields to be documented */

  @Column({ type: DataType.STRING })
  public name: string;

  @Column({ type: DataType.FLOAT(6, 3) })
  public price: number;

  @Column({ type: DataType.FLOAT(6, 3) })
  public bid: number;

  @Column({ type: DataType.FLOAT(6, 3) })
  public ask: number;

  @Column({ type: DataType.FLOAT(6, 3), field: "previous_close_price" })
  public previousClosePrice: number;

  get livePrice(): number {
    let value = undefined;
    if ((this.getDataValue("ask") !== null)
      && (this.getDataValue("bid") !== null)) {
      value = (this.getDataValue("ask") + this.getDataValue("bid")) / 2;
    } else if (this.getDataValue("price") !== null) {
      value = this.getDataValue("price");
    } else {
      value = this.getDataValue("previousClosePrice");
    }
    return (Math.round(value * 1000) / 1000);
  }

  @Column({ type: DataType.FLOAT(6, 3), field: "fifty_two_week_low" })
  public fiftyTwoWeekLow?: number;

  @Column({ type: DataType.FLOAT(6, 3), field: "fifty_two_week_high" })
  public fiftyTwoWeekHigh?: number;

  // @Column({ type: DataType.FLOAT(6, 3), field: "tick_price" })
  // public tick_price: number;

}