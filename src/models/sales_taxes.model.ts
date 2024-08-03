import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Statement } from "./statement.model";

@Table({})
export class SalesTaxes extends Model<InferAttributes<SalesTaxes>, InferCreationAttributes<SalesTaxes>> {
  // id can be undefined during creation when using `autoIncrement`
  declare id: CreationOptional<number>;
  // timestamps!
  // createdAt can be undefined during creation
  declare createdAt: CreationOptional<Date>;
  // updatedAt can be undefined during creation
  declare updatedAt: CreationOptional<Date>;

  @Column({ type: DataType.INTEGER })
  declare transactionId: number;

  /** Underlying transaction */
  @BelongsTo(() => Statement, "id")
  declare underlying: Statement;
}
