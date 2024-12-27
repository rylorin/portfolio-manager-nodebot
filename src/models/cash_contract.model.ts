import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Model, Table } from "sequelize-typescript";
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
  // Primary key
  declare id: CreationOptional<number>;

  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  /** Base contract associated with this currency pair */
  @BelongsTo(() => Contract, "id")
  declare contract: Contract;
}
