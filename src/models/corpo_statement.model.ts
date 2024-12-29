import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import { Statement } from "./statement.model";

/**
 * Represents a corporate action statement, inheriting from `Statement`.
 */
@Table({ tableName: "corporate_statement", timestamps: true })
export class CorporateStatement extends Model<
  InferAttributes<CorporateStatement>,
  InferCreationAttributes<CorporateStatement, { omit: "statement" }>
> {
  /** Primary key (inherited from `Statement`) */
  @ForeignKey(() => Statement)
  @Column({ primaryKey: true })
  declare id: number;

  /** Timestamps */
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  /** Relationship with the `Statement` model */
  @BelongsTo(() => Statement, "id")
  declare statement: Statement;

  /** Quantity impacted by the corporate action */
  @Column({
    type: DataType.FLOAT(10, 2),
    allowNull: false,
    defaultValue: 0,
  })
  declare quantity: number;

  /** Realized profit or loss (PnL) resulting from the corporate action */
  @Column({
    type: DataType.FLOAT(10, 2),
    allowNull: false,
    defaultValue: 0,
  })
  declare pnl: number;
}
