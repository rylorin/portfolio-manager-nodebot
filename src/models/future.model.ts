import {
    Model,
    Table,
    Column,
    DataType,
    BelongsTo,
} from "sequelize-typescript";
import { OptionType } from "@stoqey/ib";

import { Contract, Stock } from ".";

@Table({ tableName: "future", timestamps: true, deletedAt: false })
export class Future extends Model {

    @BelongsTo(() => Contract, "id")
    public contract: Contract;

    @BelongsTo(() => Contract, "underlying_id")
    public underlying: Contract;

    @Column({ type: DataType.DATEONLY, field: "last_trade_date" })
    // public lastTradeDate!: Date;
    get lastTradeDate(): Date {
        return new Date(this.getDataValue("lastTradeDate"));
    }
    set lastTradeDate(value: Date) {
        // Format date to YYYY-MM-DD
        const day: number = value.getDate();
        const month: number = value.getMonth() + 1;
        const year: number = value.getFullYear();
        const lastTradeDate: string = year + "-" + ((month < 10) ? "0" + month : month) + "-" + ((day < 10) ? ("0" + day) : day);
        this.setDataValue("lastTradeDate", lastTradeDate);
    }

    @Column({ type: DataType.INTEGER, defaultValue: 100 })
    public multiplier: number;

    get dte(): number {
        const dte: number = Math.floor(0.9 + (((new Date(this.getDataValue("lastTradeDate"))).getTime() - Date.now()) / 1000 / 86400));
        // console.log("dte for", this.getDataValue("lastTradeDate"), dte);
        return dte;
    }

}