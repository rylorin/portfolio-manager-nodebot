import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Model, Table } from "sequelize-typescript";
import { Contract } from ".";

@Table({ tableName: "bag_contract", timestamps: true })
export class BagContract extends Model<
  InferAttributes<BagContract>,
  InferCreationAttributes<BagContract, { omit: "contract" }>
> {
  // id can be undefined during creation when using `autoIncrement`
  declare id: CreationOptional<number>;
  // timestamps!
  // createdAt can be undefined during creation
  declare createdAt: CreationOptional<Date>;
  // updatedAt can be undefined during creation
  declare updatedAt: CreationOptional<Date>;

  @BelongsTo(() => Contract, "id")
  declare contract: Contract;
}
