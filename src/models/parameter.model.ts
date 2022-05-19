import {
  Model,
  Table,
  Column,
  DataType,
  BelongsTo,
} from "sequelize-typescript";

import { Contract } from ".";

@Table({ tableName: "trading_parameters" })
export class Parameter extends Model {

  @Column({ type: DataType.INTEGER, field: "portfolio_id" })
  public portfolio: number;

  @BelongsTo(() => Contract, "stock_id")
  public underlying: Contract;

  @Column({ type: DataType.SMALLINT, field: "csp_strategy" })
  public cspStrategy: number;

  @Column({ type: DataType.FLOAT, field: "nav_ratio" })
  public navRatio: number;

  @Column({ type: DataType.SMALLINT, field: "roll_put_strategy" })
  public rollPutStrategy: number;

  @Column({ type: DataType.SMALLINT, field: "roll_call_strategy" })
  public rollCallStrategy: number;

  @Column({ type: DataType.SMALLINT, field: "cc_strategy" })
  public ccStrategy: number;

}