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
  @Column({ type: DataType.INTEGER, field: 'con_id' })
  public conId: number;

  /** The asset symbol. */
  @Column({ type: DataType.STRING })
  public symbol!: string;

  /** The security type   */
  @Column({ type: DataType.ENUM('STK', 'OPT', 'BAG', 'CASH') })
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
  // public price : number;
  get price(): number {
    let result = undefined;
    if ((this.getDataValue('ask') !== null)
      && (this.getDataValue('bid') !== null)) {
        result = (this.getDataValue('ask') + this.getDataValue('bid')) / 2;
    } else if (this.getDataValue('price') !== null) {
      result = this.getDataValue('price');
    } else {
      result = this.getDataValue('previousClosePrice');
    }
    return result;
  }
  set price(value: number) {
    this.setDataValue('price', value);
  }

  @Column({ type: DataType.FLOAT(6, 2) })
  public bid : number;

  @Column({ type: DataType.FLOAT(6, 2) })
  public ask : number;

  // @Column({ type: DataType.DATE, field: 'bid_date' })
  // public bidDate : Date;

  // @Column({ type: DataType.DATE, field: 'ask_date' })
  // public askDate : Date;

  @Column({ type: DataType.FLOAT, field: 'previous_close_price' })
  public previousClosePrice : number;

}
 