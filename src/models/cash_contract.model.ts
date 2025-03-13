import { CreationOptional, ForeignKey, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Contract } from "./contract.model";

@Table({
  tableName: "cash_contract",
  timestamps: true,
  deletedAt: false,
})
export class CashContract extends Model<
  InferAttributes<CashContract>,
  InferCreationAttributes<CashContract, { omit: "contract" }>
> {
  /** Primary key (inherited from `Contract`) */
  @Column({ type: DataType.INTEGER, allowNull: false, primaryKey: true, unique: true })
  declare id: ForeignKey<Contract["id"]>;

  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  /** Base contract associated with this currency pair */
  @BelongsTo(() => Contract, "id")
  declare contract: Contract;
}
