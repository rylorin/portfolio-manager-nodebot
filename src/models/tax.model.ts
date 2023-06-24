import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Statement } from ".";

@Table({ tableName: "tax", timestamps: false, createdAt: false, updatedAt: false })
export class TaxStatement extends Model {
  declare id: number;

  @BelongsTo(() => Statement, "id")
  public statement: Statement;

  /** quantity */
  @Column({ type: DataType.STRING(2) })
  declare country: string;
}
