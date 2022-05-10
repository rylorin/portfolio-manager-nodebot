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

@Table({ tableName: "position", timestamps: true })
export class Position extends Model {

    /** contract */
    @BelongsTo(() => Contract, 'contract_id')
    public contract!: Contract;
      
    /** portfolio */
    @BelongsTo(() => Portfolio, 'portfolio_id')
    public portfolio!: Portfolio;

    /** cost basis */
    @Column({ type: DataType.FLOAT })
    public cost: number;

    /** quantity */
    @Column({ type: DataType.FLOAT })
    public quantity: number;

    @Column({ type: DataType.FLOAT })
    get averagePrice(): number {
      return (this.getDataValue('cost') / this.getDataValue('quantity'));
    }
  
    // /** open_date */
    // @Column({ type: DataType.DATE, field: 'open_date' })
    // public openDate: Date;

};