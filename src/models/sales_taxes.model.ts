import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
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

  /** Underlying transaction */
  // declare taxableTransactionID: ForeignKey<Contract["Statement"]>;
  @ForeignKey(() => Statement)
  @Column
  declare taxableTransactionID: number;
  @BelongsTo(() => Statement, "taxableTransactionID")
  declare taxableTransaction: CreationOptional<Statement>;

  @Column({ type: DataType.STRING })
  declare country: string;

  @Column({ type: DataType.STRING })
  declare taxType: string;

  @Column({ type: DataType.FLOAT })
  declare taxableAmount: number;

  @Column({ type: DataType.FLOAT })
  declare taxRate: number;

  @Column({ type: DataType.FLOAT })
  declare salesTax: number;
}
