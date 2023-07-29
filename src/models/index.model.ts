import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Model, Table } from "sequelize-typescript";
import { Contract } from ".";

@Table({ tableName: "index_contract", timestamps: false, createdAt: false, updatedAt: false })
export class Index extends Model<InferAttributes<Index>, InferCreationAttributes<Index, { omit: "contract" }>> {
  // id can be undefined during creation when using `autoIncrement`
  declare id: CreationOptional<number>;
  // timestamps!
  // createdAt can be undefined during creation
  declare createdAt: CreationOptional<Date>;
  // updatedAt can be undefined during creation
  declare updatedAt: CreationOptional<Date>;

  @BelongsTo(() => Contract, "id")
  public contract: Contract;
}
