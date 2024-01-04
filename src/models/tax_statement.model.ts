import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Statement } from ".";

@Table({ tableName: "tax_statement", timestamps: false, createdAt: false, updatedAt: false })
export class TaxStatement extends Model<
  InferAttributes<TaxStatement>,
  InferCreationAttributes<TaxStatement, { omit: "statement" }>
> {
  // id can be undefined during creation when using `autoIncrement`
  declare id: CreationOptional<number>;
  // timestamps!
  // createdAt can be undefined during creation
  declare createdAt: CreationOptional<Date>;
  // updatedAt can be undefined during creation
  declare updatedAt: CreationOptional<Date>;

  @BelongsTo(() => Statement, "id")
  public statement: Statement;

  /** country */
  @Column({ type: DataType.STRING(2) })
  declare country: string;
}
