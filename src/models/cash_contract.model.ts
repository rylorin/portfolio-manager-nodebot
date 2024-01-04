import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Model, Table } from "sequelize-typescript";
import { Contract } from ".";

@Table({ tableName: "cash_contract", timestamps: true, deletedAt: false })
export class CashContract extends Model<
  InferAttributes<CashContract>,
  InferCreationAttributes<CashContract, { omit: "contract" }>
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
