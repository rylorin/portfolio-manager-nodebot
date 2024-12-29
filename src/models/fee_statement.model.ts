import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import { Statement } from "./statement.model";

@Table({
  tableName: "fee_statement",
  timestamps: false, // Désactivation explicite car déjà gérés dans Statement
})
export class FeeStatement extends Model<
  InferAttributes<FeeStatement>,
  InferCreationAttributes<FeeStatement, { omit: "statement" }>
> {
  /** Clé primaire reliée à Statement */
  @ForeignKey(() => Statement)
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    allowNull: false,
  })
  declare id: CreationOptional<number>;

  /** Relation avec le modèle parent Statement */
  @BelongsTo(() => Statement, "id")
  declare statement: Statement;
}
