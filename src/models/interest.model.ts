import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Model, Table } from "sequelize-typescript";
import { Statement } from ".";

@Table({ tableName: "interest_statement", timestamps: false, createdAt: false, updatedAt: false })
export class InterestStatement extends Model<
  InferAttributes<InterestStatement>,
  InferCreationAttributes<InterestStatement, { omit: "statement" }>
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
}
