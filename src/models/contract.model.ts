import {
  Model,
  Table,
  Column,
  DataType,
  HasMany,
  HasOne,
  BelongsToMany,
  BelongsTo,
  ForeignKey
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

  /* other fields */

  @Column({ type: DataType.STRING })
  public name: string;

  @Column({ type: DataType.FLOAT(6, 3) })
  get price(): number {
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
  set price(value: number) {
    this.setDataValue("price", (Math.round(value * 1000) / 1000));
  }

  @Column({ type: DataType.FLOAT(6, 2) })
  public bid : number;

  @Column({ type: DataType.FLOAT(6, 2) })
  public ask : number;

  @Column({ type: DataType.FLOAT, field: "previous_close_price" })
  public previousClosePrice : number;

}
 