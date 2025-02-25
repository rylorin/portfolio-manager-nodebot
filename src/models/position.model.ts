import {
  Association,
  CreationOptional,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  NonAttribute,
} from "sequelize";
import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript";
import { Contract } from "./contract.model";
import { Portfolio } from "./portfolio.model";
import { Trade } from "./trade.model";

@Table({ tableName: "position", timestamps: true })
export class Position extends Model<
  InferAttributes<Position>,
  InferCreationAttributes<Position, { omit: "contract" | "portfolio" | "trade" }>
> {
  // id can be undefined during creation when using `autoIncrement`
  declare id: CreationOptional<number>;

  // timestamps!
  // createdAt can be undefined during creation
  declare createdAt: CreationOptional<Date>;
  // updatedAt can be undefined during creation
  declare updatedAt: CreationOptional<Date>;

  /** Portfolio */
  declare portfolio_id: ForeignKey<Portfolio["id"]>;
  @BelongsTo(() => Portfolio, "portfolio_id")
  declare portfolio: Portfolio;

  /** Related Contract */
  declare contract_id: ForeignKey<Contract["id"]>;
  @BelongsTo(() => Contract, "contract_id")
  declare contract: Contract;

  /** cost basis */
  @Column({ type: DataType.FLOAT })
  declare cost: number;

  /** quantity */
  @Column({ type: DataType.FLOAT })
  declare quantity: number;

  get averagePrice(): NonAttribute<number> {
    return this.getDataValue("cost") / this.getDataValue("quantity");
  }

  /** Optional related trade */
  declare trade_unit_id: ForeignKey<Trade["id"]> | null;
  @BelongsTo(() => Trade, "trade_unit_id")
  declare trade?: Trade;

  declare static associations: {
    portfolio: Association<Position, Portfolio>;
    contract: Association<Position, Contract>;
    trade: Association<Position, Trade>;
  };
}
