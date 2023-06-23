import { OrderAction } from "@stoqey/ib";
import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";

import { Contract } from ".";

@Table({ tableName: "open_order", timestamps: true, createdAt: true, updatedAt: true, deletedAt: false })
export class OpenOrder extends Model {
  declare id: number;

  @BelongsTo(() => Contract, "contract_id")
  public contract!: Contract;

  @Column({ type: DataType.INTEGER, field: "perm_id" })
  declare permId: number;

  @Column({ type: DataType.INTEGER, field: "order_id" })
  declare orderId: number;

  @Column({ type: DataType.INTEGER, field: "client_id" })
  declare clientId: number;

  @Column({ type: DataType.INTEGER, field: "portfolio_id" })
  declare portfolioId: number;

  @Column({ type: DataType.STRING(4), field: "action_type" })
  declare actionType: OrderAction;

  @Column({ type: DataType.FLOAT, field: "total_qty" })
  declare totalQty: number;

  @Column({ type: DataType.FLOAT, field: "cash_qty" })
  declare cashQty?: number;

  @Column({ type: DataType.FLOAT, field: "lmt_price" })
  declare lmtPrice?: number;

  @Column({ type: DataType.FLOAT, field: "aux_price" })
  declare auxPrice?: number;

  @Column({ type: DataType.STRING })
  declare status: string;

  @Column({ type: DataType.FLOAT, field: "remaining_qty" })
  declare remainingQty: number;
}
