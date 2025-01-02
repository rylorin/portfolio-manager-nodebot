import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import { Statement } from "./statement.model";

@Table({
  tableName: "sales_taxes", // Nom de la table spécifié
  timestamps: true, // Ajout des timestamps pour faciliter le suivi des opérations
})
export class SalesTaxes extends Model<InferAttributes<SalesTaxes>, InferCreationAttributes<SalesTaxes>> {
  // Identifiant unique de la taxe de vente, auto-incrémenté
  declare id: CreationOptional<number>;

  // Timestamp de création de la ligne
  declare createdAt: CreationOptional<Date>;

  // Timestamp de la dernière mise à jour de la ligne
  declare updatedAt: CreationOptional<Date>;

  /** Identifiant de la transaction sous-jacente liée à cette taxe de vente */
  @ForeignKey(() => Statement)
  @Column({
    type: DataType.INTEGER,
    allowNull: false, // Assure que cet identifiant est obligatoire
  })
  declare taxableTransactionID: number;

  /** Relation avec le modèle Statement, permettant de lier une transaction */
  @BelongsTo(() => Statement, "taxableTransactionID")
  declare taxableTransaction: Statement;

  /** Pays où la taxe est appliquée */
  @Column({
    type: DataType.CHAR(2), // Limite la longueur à 2 caractères pour le code pays (ex: FR, US)
    allowNull: false,
    validate: {
      isAlpha: true,
      isUppercase: true,
      len: [2, 2],
    },
  })
  declare country: string;

  /** Type de taxe (ex: TVA, impôt sur les ventes) */
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare taxType: string;

  /** Montant imposable sur lequel la taxe est calculée */
  @Column({
    type: DataType.FLOAT,
    allowNull: false,
    defaultValue: 0,
  })
  declare taxableAmount: number;

  /** Taux de la taxe applicable */
  @Column({
    type: DataType.FLOAT,
    allowNull: false,
    defaultValue: 0,
  })
  declare taxRate: number;

  /** Montant total de la taxe de vente calculée */
  @Column({
    type: DataType.FLOAT,
    allowNull: false,
    defaultValue: 0,
  })
  declare salesTax: number;
}
