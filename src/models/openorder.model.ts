import { OrderAction } from "@stoqey/ib";
import { CreationOptional, ForeignKey, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Contract } from ".";
import { Portfolio } from "./portfolio.model";

@Table({ tableName: "open_order", timestamps: true, createdAt: true, updatedAt: true, deletedAt: false })
export class OpenOrder extends Model<
  InferAttributes<OpenOrder>,
  InferCreationAttributes<OpenOrder, { omit: "contract" | "portfolio" }>
> {
  // id can be undefined during creation when using `autoIncrement`
  declare id: CreationOptional<number>;
  // timestamps!
  // createdAt can be undefined during creation
  declare createdAt: CreationOptional<Date>;
  // updatedAt can be undefined during creation
  declare updatedAt: CreationOptional<Date>;

  /** Portfolio */
  declare portfolio_id: ForeignKey<Portfolio["id"]>;
  @BelongsTo(() => Portfolio, "portfolio_id")
  declare portfolio: Portfolio;

  /** Related Contract */
  declare contract_id: ForeignKey<Contract["id"]>;
  @BelongsTo(() => Contract, "contract_id")
  declare contract: Contract;

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
