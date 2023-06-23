import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";

import { Portfolio } from ".";

@Table({ tableName: "balance", timestamps: true })
export class Balance extends Model {
  /** Portfolio */
  @ForeignKey(() => Portfolio)
  @Column
  declare portfolio_id: number;
  @BelongsTo(() => Portfolio, "portfolio_id")
  declare portfolio: Portfolio;

  /** The asset symbol. */
  @Column({ type: DataType.STRING(3) })
  declare currency: string;

  /** quantity */
  @Column({ type: DataType.FLOAT(8, 2), defaultValue: 0 })
  declare quantity: number;
}
