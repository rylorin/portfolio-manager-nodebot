import {
    Model,
    Table,
    Column,
    DataType,
    HasMany,
    HasOne,
    BelongsToMany,
    BelongsTo,
    ForeignKey,
    Default,
    AllowNull
} from "sequelize-typescript";

@Table({ tableName: "currency", timestamps: false })
export class Currency extends Model {

  @Column({ type: DataType.STRING(3) })
  public base: string;

  @Column({ type: DataType.STRING(3) })
  public currency: string;

  @Column({ type: DataType.FLOAT })
  public rate: number;

}