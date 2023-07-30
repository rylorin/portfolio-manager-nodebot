import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import { Contract, Statement } from ".";
import { Option } from "./option.model";

@Table({ tableName: "trade_option", timestamps: false, createdAt: false, updatedAt: false })
export class OptionStatement extends Model<
  InferAttributes<OptionStatement>,
  InferCreationAttributes<OptionStatement, { omit: "statement" }>
> {
  // id can be undefined during creation when using `autoIncrement`
  declare id: CreationOptional<number>;
  // timestamps!
  // createdAt can be undefined during creation
  declare createdAt: CreationOptional<Date>;
  // updatedAt can be undefined during creation
  declare updatedAt: CreationOptional<Date>;

  @BelongsTo(() => Statement, "id")
  declare statement: Statement;

  /** quantity */
  @Column({ type: DataType.FLOAT(8, 2), defaultValue: 0 })
  declare quantity: number;

  /** price */
  @Column({ type: DataType.FLOAT(8, 3), defaultValue: 0 })
  declare price: number;

  /** proceeds */
  @Column({ type: DataType.FLOAT(8, 2), defaultValue: 0 })
  declare proceeds: number;

  /** fees */
  @Column({ type: DataType.FLOAT(8, 2), defaultValue: 0 })
  declare fees: number;

  /** realizedPnL */
  @Column({ type: DataType.FLOAT(8, 2), defaultValue: 0, field: "realized_pnl" })
  declare realizedPnL: number;

  /** status */
  @Column({ type: DataType.SMALLINT, defaultValue: 0 })
  declare status: number;

  /** related Contract */
  @ForeignKey(() => Contract)
  @Column
  declare contract_id: number;
  @BelongsTo(() => Contract, "contract_id")
  declare contract: Contract;
  @BelongsTo(() => Option, "contract_id")
  declare option: Option;
}
