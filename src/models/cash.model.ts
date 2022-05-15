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
  
  import { Contract } from ".";
  
  @Table({ tableName: "cash_contract", timestamps: false, createdAt: false, updatedAt: false })
  export class Cash extends Model {
  
    @BelongsTo(() => Contract, "id")
    public contract: Contract;
  
  }