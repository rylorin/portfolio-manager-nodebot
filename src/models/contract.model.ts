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

@Table({ tableName: "contract", timestamps: false, createdAt: false, updatedAt: false })
export class Contract extends Model {

  /** The unique IB contract identifier. */
  @Column({ type: DataType.INTEGER, field: 'con_id' })
  public conId: number;

  /** The asset symbol. */
  @Column({ type: DataType.STRING })
  public symbol!: string;

  /** The security type   */
  @Column({ type: DataType.ENUM('STK', 'OPT') })
  public secType!: string;

  /** The destination exchange. */
  @Column({ type: DataType.STRING })
  public exchange: string;

  /** The trading currency. */
  @Column({ type: DataType.STRING(3) })
  public currency: string;

  /* other fields */

  @Column({ type: DataType.STRING })
  public name: string;

  @Column({ type: DataType.FLOAT })
  public bid : number;

  @Column({ type: DataType.FLOAT })
  public ask : number;

  @Column({ type: DataType.FLOAT })
  public price : number;

  @Column({ type: DataType.DATE, field: 'bid_date' })
  public bidDate : Date;

  @Column({ type: DataType.DATE, field: 'ask_date' })
  public askDate : Date;

  @Column({ type: DataType.DATE })
  public updated : Date;

  @Column({ type: DataType.FLOAT, field: 'previous_close_price' })
  public previousClosePrice : number;

}
 