import { BelongsTo, Model, Table } from "sequelize-typescript";

import { Contract } from ".";

@Table({ tableName: "index_contract", timestamps: false, createdAt: false, updatedAt: false })
export class Index extends Model {
  declare id: number;

  @BelongsTo(() => Contract, "id")
  public contract: Contract;
}
