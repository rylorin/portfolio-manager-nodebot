import { CreationOptional, ForeignKey, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Portfolio } from "./portfolio.model";

@Table({ tableName: "balance", timestamps: true })
export class Balance extends Model<InferAttributes<Balance>, InferCreationAttributes<Balance, { omit: "portfolio" }>> {
  // id can be undefined during creation when using `autoIncrement`
  declare id: CreationOptional<number>;
  // timestamps!
  // createdAt can be undefined during creation
  declare createdAt: CreationOptional<Date>;
  // updatedAt can be undefined during creation
  declare updatedAt: CreationOptional<Date>;

  /** Portfolio */
  declare portfolio_id: ForeignKey<Portfolio["id"]>;
  @BelongsTo(() => Portfolio, "portfolio_id")
  declare portfolio: Portfolio;

  /** The asset symbol. */
  @Column({ type: DataType.STRING(3) })
  declare currency: string;

  /** quantity */
  @Column({ type: DataType.FLOAT(8, 2), defaultValue: 0 })
  declare quantity: number;
}
