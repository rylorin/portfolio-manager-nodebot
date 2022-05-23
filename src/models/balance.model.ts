import {
    Model,
    Table,
    BelongsTo,
    Column,
    DataType,
} from "sequelize-typescript";

import { Contract, Portfolio } from ".";

@Table({ tableName: "balance", timestamps: true })
export class Balance extends Model {

    /** portfolio */
    @BelongsTo(() => Portfolio, "portfolio_id")
    public portfolio!: Portfolio;

    /** The asset symbol. */
    @Column({ type: DataType.STRING(3) })
    public currency!: string;

    /** quantity */
    @Column({ type: DataType.FLOAT(8, 2) })
    public quantity: number;

}