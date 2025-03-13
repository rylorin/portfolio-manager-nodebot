import { InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import { Statement } from ".";

@Table({
  tableName: "tax_statement",
  timestamps: false,
})
export class TaxStatement extends Model<InferAttributes<TaxStatement>, InferCreationAttributes<TaxStatement>> {
  /** Primary key (inherited from `Statement`) */
  @ForeignKey(() => Statement)
  @Column({ primaryKey: true })
  declare id: number;

  /** Identifiant de la transaction associée à cette taxe */
  @BelongsTo(() => Statement, "id")
  declare statement: Statement;

  /** Country code which collected this tax */
  @Column({
    type: DataType.STRING(2),
    allowNull: false, // Assure que cette valeur est obligatoire
    validate: {
      isAlpha: true,
      isUppercase: true,
      len: [2, 2],
    },
  })
  declare country: string;
}
