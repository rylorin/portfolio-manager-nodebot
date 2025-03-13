import { CreationOptional, InferAttributes, InferCreationAttributes, NonAttribute } from "sequelize";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { ContractType } from "./contract.types";

@Table({ tableName: "contract", timestamps: true })
export class Contract extends Model<
  InferAttributes<Contract>,
  InferCreationAttributes<
    Contract,
    { omit: "name" | "price" | "ask" | "bid" | "previousClosePrice" | "fiftyTwoWeekLow" | "fiftyTwoWeekHigh" }
  >
> {
  // Auto-incremented ID
  @Column({ type: DataType.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true, unique: true })
  declare id: CreationOptional<number>;

  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  /** The unique IB contract identifier. */
  @Column({ type: DataType.INTEGER, field: "con_id", allowNull: false })
  declare conId: number;

  /** International Securities Identification Number (ISIN). */
  @Column({ type: DataType.CHAR(12), field: "ISIN" })
  declare isin: string | null;

  /** The asset ticker (e.g., AAPL, TSLA). */
  @Column({ type: DataType.STRING, allowNull: false })
  declare symbol: string;

  /** The security type (e.g., STOCK, FUTURE). */
  @Column({
    type: DataType.ENUM(typeof ContractType),
    allowNull: false,
  })
  declare secType: ContractType;

  /** The destination exchange (default: SMART). */
  @Column({ type: DataType.STRING, defaultValue: "SMART", allowNull: false })
  declare exchange: string;

  /** The trading currency (ISO 4217 format). */
  @Column({
    type: DataType.CHAR(3),
    allowNull: false,
    validate: {
      isAlpha: true,
      isUppercase: true,
      len: [3, 3],
    },
  })
  declare currency: string;

  /** The name of the contract. */
  @Column({ type: DataType.STRING, defaultValue: "", allowNull: false })
  declare name: string;

  /** The last traded price. */
  @Column({ type: DataType.FLOAT })
  declare price: number | null;

  /** The current bid price. */
  @Column({ type: DataType.FLOAT })
  declare bid: number | null;

  /** The current ask price. */
  @Column({ type: DataType.FLOAT })
  declare ask: number | null;

  /** The previous closing price. */
  @Column({ type: DataType.FLOAT, field: "previous_close_price" })
  declare previousClosePrice: number | null;

  /** The 52-week lowest price. */
  @Column({ type: DataType.FLOAT, field: "fifty_two_week_low" })
  declare fiftyTwoWeekLow: number | null;

  /** The 52-week highest price. */
  @Column({ type: DataType.FLOAT, field: "fifty_two_week_high" })
  declare fiftyTwoWeekHigh: number | null;

  /** Calculates the live price based on bid, ask, or fallback values. */
  get livePrice(): NonAttribute<number | null> {
    const bid = this.getDataValue("bid");
    const ask = this.getDataValue("ask");
    const price = this.getDataValue("price");
    const previousClosePrice = this.getDataValue("previousClosePrice");

    if (bid !== null && ask !== null) {
      return (bid + ask) / 2;
    } else if (price !== null) {
      return price;
    }
    return previousClosePrice;
  }

  // Example for future relationships:
  // @HasMany(() => Position, { sourceKey: "id", foreignKey: "contract_id" })
  // declare positions: Position[];
}
