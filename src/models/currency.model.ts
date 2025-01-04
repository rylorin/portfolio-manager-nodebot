import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";
import { Column, DataType, Model, Table } from "sequelize-typescript";

@Table({ tableName: "currency", timestamps: true })
export class Currency extends Model<InferAttributes<Currency>, InferCreationAttributes<Currency>> {
  // id can be undefined during creation when using `autoIncrement`
  declare id: CreationOptional<number>;
  // timestamps!
  // createdAt can be undefined during creation
  declare createdAt: CreationOptional<Date>;
  // updatedAt can be undefined during creation
  declare updatedAt: CreationOptional<Date>;

  @Column({
    type: DataType.STRING(3),
    validate: {
      isAlpha: true,
      isUppercase: true,
      len: [3, 3],
    },
  })
  declare base: string;

  @Column({
    type: DataType.STRING(3),
    validate: {
      isAlpha: true,
      isUppercase: true,
      len: [3, 3],
    },
  })
  declare currency: string;

  @Column({ type: DataType.FLOAT })
  declare rate: number;

  // @BelongsTo(() => Portfolio, { foreignKey: "base", targetKey: "baseCurrency" })
  // declare portfolios: Portfolio[];
}
