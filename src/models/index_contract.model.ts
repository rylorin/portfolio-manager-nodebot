import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Model, Table } from "sequelize-typescript";
import { Contract } from "./contract.model";

@Table({ tableName: "index_contract", timestamps: true, deletedAt: false })
export class Index extends Model<InferAttributes<Index>, InferCreationAttributes<Index, { omit: "contract" }>> {
  // Primary key
  declare id: CreationOptional<number>;

  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  /** Base contract associated with this index */
  @BelongsTo(() => Contract, "id")
  public contract: Contract;
}
