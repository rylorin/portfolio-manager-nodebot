import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Model, Table } from "sequelize-typescript";
import { Contract } from ".";

@Table({ tableName: "bag_contract", timestamps: true })
export class BagContract extends Model<
  InferAttributes<BagContract>,
  InferCreationAttributes<BagContract, { omit: "contract" }>
> {
  // Primary key
  declare id: number;

  /** Base contract associated with this bag */
  @BelongsTo(() => Contract, "id")
  declare contract: Contract;

  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
