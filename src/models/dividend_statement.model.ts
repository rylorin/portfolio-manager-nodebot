import { InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import { Statement } from "./statement.model";

/**
 * Represents a dividend payment statement, inheriting from `Statement`.
 */
@Table({
  tableName: "dividend_statement",
  timestamps: false,
})
export class DividendStatement extends Model<
  InferAttributes<DividendStatement>,
  InferCreationAttributes<DividendStatement, { omit: "statement" }>
> {
  /** Primary key (inherited from `Statement`) */
  @ForeignKey(() => Statement)
  @Column({ primaryKey: true })
  declare id: number;

  /** Relationship with the `Statement` model */
  @BelongsTo(() => Statement, "id")
  declare statement: Statement;

  /** Country of origin for the dividend payment */
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
