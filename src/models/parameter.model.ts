import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";

import { Contract } from ".";

@Table({ tableName: "trading_parameters" })
export class Parameter extends Model {
  @Column({ type: DataType.INTEGER, field: "portfolio_id" })
  declare portfolio: number;

  @BelongsTo(() => Contract, "stock_id")
  public underlying: Contract;

  @Column({ type: DataType.SMALLINT, field: "csp_strategy" })
  declare cspStrategy: number;

  @Column({ type: DataType.FLOAT, field: "nav_ratio" })
  declare navRatio: number;

  @Column({ type: DataType.SMALLINT, field: "roll_put_strategy" })
  declare rollPutStrategy: number;

  @Column({ type: DataType.SMALLINT, field: "roll_call_strategy" })
  declare rollCallStrategy: number;

  @Column({ type: DataType.SMALLINT, field: "cc_strategy" })
  declare ccStrategy: number;
}
