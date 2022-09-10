import {
    Model,
    Table,
    BelongsTo,
} from "sequelize-typescript";

import { Contract } from ".";

@Table({ tableName: "index_contract", timestamps: false, createdAt: false, updatedAt: false })
export class Index extends Model {

    @BelongsTo(() => Contract, "id")
    public contract: Contract;

}