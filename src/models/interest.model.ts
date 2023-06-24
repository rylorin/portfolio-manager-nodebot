import { BelongsTo, Model, Table } from "sequelize-typescript";
import { Statement } from ".";

@Table({ tableName: "interest_statement", timestamps: false, createdAt: false, updatedAt: false })
export class InterestStatement extends Model {
  declare id: number;

  @BelongsTo(() => Statement, "id")
  public statement: Statement;
}
