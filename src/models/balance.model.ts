import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import { Portfolio } from "./portfolio.model";

@Table({
  tableName: "balance", // Use plural for table names (common convention)
  timestamps: true, // Enable timestamps for createdAt and updatedAt
  comment: "Represents an account balance in a specific currency.",
})
export class Balance extends Model<InferAttributes<Balance>, InferCreationAttributes<Balance, { omit: "portfolio" }>> {
  // Primary key
  declare id: CreationOptional<number>;

  /** Timestamp for when the record was created */
  @Column({ type: DataType.DATE, allowNull: false })
  declare createdAt: CreationOptional<Date>;

  /** Timestamp for when the record was last updated */
  @Column({ type: DataType.DATE, allowNull: false })
  declare updatedAt: CreationOptional<Date>;

  /** Foreign key referencing the portfolio */
  @ForeignKey(() => Portfolio)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare portfolio_id;

  /** The associated portfolio */
  @BelongsTo(() => Portfolio, "portfolio_id")
  declare portfolio: Portfolio;

  /** The asset currency symbol (e.g., USD, EUR, GBP) */
  @Column({
    type: DataType.STRING(3),
    allowNull: false,
    validate: {
      isUppercase: true,
      isAlpha: true,
      len: [3, 3], // Ensure exactly 3 characters
    },
  })
  declare currency: string;

  /** The quantity or balance available in the specified currency */
  @Column({
    type: DataType.FLOAT(12, 2), // Increased precision to handle larger balances
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0, // Ensure non-negative balance
    },
  })
  declare quantity: number;
}
