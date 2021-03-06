import { OrderAction } from "@stoqey/ib";
import {
  Model,
  Table,
  Column,
  DataType,
  BelongsTo,
} from "sequelize-typescript";

import { Contract } from ".";

@Table({ tableName: "open_order", timestamps: true, createdAt: true, updatedAt: true, deletedAt: false })
export class OpenOrder extends Model {

  @BelongsTo(() => Contract, "contract_id")
  public contract!: Contract;

  @Column({ type: DataType.INTEGER, field: "perm_id" })
  public permId!: number;

  @Column({ type: DataType.INTEGER, field: "order_id" })
  public orderId: number;

  @Column({ type: DataType.INTEGER, field: "client_id" })
  public clientId: number;

  @Column({ type: DataType.INTEGER, field: "portfolio_id" })
  public portfolioId!: number;

  @Column({ type: DataType.STRING(4), field: "action_type" })
  public actionType!: OrderAction;

  @Column({ type: DataType.FLOAT, field: "total_qty" })
  public totalQty!: number;

  @Column({ type: DataType.FLOAT, field: "cash_qty" })
  public cashQty?: number;

  @Column({ type: DataType.FLOAT, field: "lmt_price" })
  public lmtPrice?: number;

  @Column({ type: DataType.FLOAT, field: "aux_price" })
  public auxPrice?: number;

  @Column({ type: DataType.STRING })
  public status!: string;

  @Column({ type: DataType.FLOAT, field: "remaining_qty" })
  public remainingQty!: number;

}