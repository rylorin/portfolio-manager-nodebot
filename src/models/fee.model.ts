import { BelongsTo, Model, Table } from "sequelize-typescript";
import { Statement } from ".";

@Table({ tableName: "fee_statement", timestamps: false, createdAt: false, updatedAt: false })
export class FeeStatement extends Model {
  declare id: number;

  @BelongsTo(() => Statement, "id")
  public statement: Statement;
}
