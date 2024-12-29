import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import { Statement } from "./statement.model";

@Table({
  tableName: "interest_statement",
  timestamps: false, // Pas de gestion de timestamps directement, héritage via Statement
  createdAt: false,
  updatedAt: false,
})
export class InterestStatement extends Model<
  InferAttributes<InterestStatement>,
  InferCreationAttributes<InterestStatement, { omit: "statement" }>
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

  /** Pays d'origine des intérêts */
  @Column({
    type: DataType.STRING(2),
    allowNull: true,
  })
  declare country?: string;
}
