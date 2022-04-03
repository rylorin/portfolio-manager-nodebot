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

@Table({ tableName: "portfolio", timestamps: false, deletedAt: false, updatedAt: false })
export class Portfolio extends Model {

  /** The account number. */
  @Column({ type: DataType.STRING })
  public account!: string;

};