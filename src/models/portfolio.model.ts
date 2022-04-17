import {
    Model,
    Table,
    Column,
    DataType,
    HasMany,
    HasOne,
    BelongsToMany,
    BelongsTo,
    ForeignKey
} from "sequelize-typescript";
import { Contract } from '.';

@Table({ tableName: "portfolio", timestamps: false, deletedAt: false, updatedAt: false })
export class Portfolio extends Model {

  /** The account number. */
  @Column({ type: DataType.STRING })
  public account!: string;

  /** The benchmark symbol. */
  @BelongsTo(() => Contract, 'benchmark_id')
  public benchmark?: Contract;

  @Column({ type: DataType.STRING(3), field: 'base_currency' })
  public baseCurrency: string;

};