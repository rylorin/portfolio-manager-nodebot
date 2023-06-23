import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Portfolio } from "./portfolio.model";

@Table({ tableName: "currency", timestamps: true })
export class Currency extends Model {
  declare id: number;

  @Column({ type: DataType.STRING(3) })
  declare base: string;

  @Column({ type: DataType.STRING(3) })
  declare currency: string;

  @Column({ type: DataType.FLOAT })
  declare rate: number;

  @BelongsTo(() => Portfolio, { foreignKey: "base", targetKey: "baseCurrency" })
  declare portfolios: Portfolio[];
}
