import { InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, ForeignKey, Model, Table } from "sequelize-typescript";
import { Statement } from "./statement.model";

@Table({
  tableName: "fee_statement",
  timestamps: false, // Désactivation explicite car déjà gérés dans Statement
})
export class FeeStatement extends Model<
  InferAttributes<FeeStatement>,
  InferCreationAttributes<FeeStatement, { omit: "statement" }>
> {
  /** Primary key (inherited from `Statement`) */
  @ForeignKey(() => Statement)
  @Column({ primaryKey: true })
  declare id: number;

  /** Relation avec le modèle parent Statement */
  @BelongsTo(() => Statement, "id")
  declare statement: Statement;
}
