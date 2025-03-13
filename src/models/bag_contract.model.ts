import { CreationOptional, ForeignKey, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Contract } from ".";

@Table({ tableName: "bag_contract", timestamps: true })
export class BagContract extends Model<
  InferAttributes<BagContract>,
  InferCreationAttributes<BagContract, { omit: "contract" }>
> {
  /** Primary key (inherited from `Contract`) */
  @Column({ type: DataType.INTEGER, allowNull: false, primaryKey: true, unique: true })
  declare id: ForeignKey<Contract["id"]>;

  /** Base contract associated with this bag */
  @BelongsTo(() => Contract, "id")
  declare contract: Contract;

  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
