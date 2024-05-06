import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Statement } from ".";

@Table({ tableName: "corporate_statement", timestamps: true })
export class CorporateStatement extends Model<
  InferAttributes<CorporateStatement>,
  InferCreationAttributes<CorporateStatement, { omit: "statement" }>
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

  /** quantity */
  @Column({ type: DataType.FLOAT(10, 2), defaultValue: 0 })
  declare quantity: number;

  /** PnL */
  @Column({ type: DataType.FLOAT(10, 2), defaultValue: 0 })
  declare pnl: number;
}
