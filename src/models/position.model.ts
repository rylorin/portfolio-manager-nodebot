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
import { Contract, Portfolio } from ".";

@Table({ tableName: "position", timestamps: true, createdAt: false, deletedAt: false })
export class Position extends Model {

    /** contract */
    @BelongsTo(() => Contract, 'contract_id')
    public contract!: Contract;
      
    /** portfolio */
    @BelongsTo(() => Portfolio, 'portfolio_id')
    public portfolio!: Portfolio;

    /** cost */
    @Column({ type: DataType.FLOAT })
    public cost: number;

    /** quantity */
    @Column({ type: DataType.FLOAT })
    public quantity: number;

    /** open_date */
    @Column({ type: DataType.DATE, field: 'open_date' })
    public openDate: Date;

};