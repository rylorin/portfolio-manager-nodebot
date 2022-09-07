import {
    Model,
    Table,
    Column,
    DataType,
    BelongsTo,
} from "sequelize-typescript";
import { Contract, Portfolio } from ".";

@Table({ tableName: "trade_unit", timestamps: false })
export class Trade extends Model {

    /** contract */
    @BelongsTo(() => Contract, "symbol_id")
    public contract!: Contract;

    /** portfolio */
    @BelongsTo(() => Portfolio, "portfolio_id")
    public portfolio!: Portfolio;

    public strategy: number;

    @Column({ type: DataType.DATE, field: "opening_date" })
    public openingDate: Date;

    @Column({ type: DataType.DATE, field: "closing_date" })
    public closingDate: Date;

    public status: number;

    @Column({ type: DataType.FLOAT, field: "pn_l" })
    public PnL: number;

    @Column({ type: DataType.STRING(3) })
    public currency: string;

    @Column({ type: DataType.FLOAT })
    public risk: number;

    public comment: string;
}