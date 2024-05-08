import { CreationOptional, ForeignKey, InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Contract, Statement } from ".";
import { OptionContract } from "./option_contract.model";

@Table({ tableName: "option_statement", timestamps: false, createdAt: false, updatedAt: false })
export class OptionStatement extends Model<
  InferAttributes<OptionStatement>,
  InferCreationAttributes<OptionStatement, { omit: "statement" | "contract" | "option" }>
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

  /** Base contract part of the option */
  declare contract_id: ForeignKey<Contract["id"]>;
  @BelongsTo(() => Contract, "contract_id")
  declare contract: Contract;
  /** Option part of the option */
  @BelongsTo(() => OptionContract, "contract_id")
  declare option: OptionContract;
}
