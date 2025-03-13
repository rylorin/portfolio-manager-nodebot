import { InferAttributes, InferCreationAttributes } from "sequelize";
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
  /** Primary key (inherited from `Statement`) */
  @ForeignKey(() => Statement)
  @Column({ primaryKey: true })
  declare id: number;

  /** Relation avec le modèle parent Statement */
  @BelongsTo(() => Statement, "id")
  declare statement: Statement;

  /** Pays d'origine des intérêts */
  @Column({
    type: DataType.CHAR(2),
    allowNull: true,
    validate: {
      isAlpha: true,
      isUppercase: true,
      len: [2, 2],
    },
  })
  declare country?: string;
}
