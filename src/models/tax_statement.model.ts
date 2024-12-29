import { InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Statement } from ".";

@Table({
  tableName: "tax_statement", // Nom de la table dans la base de données
  timestamps: false,
})
export class TaxStatement extends Model<InferAttributes<TaxStatement>, InferCreationAttributes<TaxStatement>> {
  // Identifiant unique de l'enregistrement, auto-incrémenté
  declare id: number;

  /** Identifiant de la transaction associée à cette déclaration fiscale */
  @BelongsTo(() => Statement, "id")
  declare statement: Statement;

  /** Code du pays associé à cette déclaration fiscale */
  @Column({
    type: DataType.STRING(2), // Limite à 2 caractères (ex: FR, US)
    allowNull: false, // Assure que cette valeur est obligatoire
  })
  declare country: string;
}
