import { BelongsTo, Model, Table } from "sequelize-typescript";

import { Contract } from ".";

@Table({ tableName: "bag_contract", timestamps: false, createdAt: false, updatedAt: false })
export class Bag extends Model {
  @BelongsTo(() => Contract, "id")
  declare contract: Contract;
}
