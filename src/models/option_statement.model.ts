import { InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import { Contract, Statement } from ".";
import { OptionContract } from "./option_contract.model";

@Table({
  tableName: "option_statement",
  timestamps: false,
})
export class OptionStatement extends Model<
  InferAttributes<OptionStatement>,
  InferCreationAttributes<OptionStatement, { omit: "statement" | "contract" | "option" }>
> {
  /** Primary key (inherited from `Statement`) */
  @ForeignKey(() => Statement)
  @Column({ primaryKey: true })
  declare id: number;

  /** Relation avec le modèle parent Statement */
  @BelongsTo(() => Statement, "id")
  declare statement: Statement;

  /** Quantité d'options traitées (ex : nombre de contrats) */
  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
    allowNull: false,
  })
  declare quantity: number;

  /** Prix appliqué à l'option lors de la transaction */
  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
    allowNull: false,
  })
  declare price: number;

  /** Montant des produits générés (proceeds) par l'opération */
  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
    allowNull: false,
  })
  declare proceeds: number;

  /** Frais associés à l'opération */
  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
    allowNull: false,
  })
  declare fees: number;

  /** Gain ou perte réalisée lors de l'opération */
  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
    field: "realized_pnl",
    allowNull: false,
  })
  declare realizedPnL: number;

  /** Statut du statement (ex: ouverte, fermée, etc.) */
  @Column({
    type: DataType.SMALLINT,
    defaultValue: 0,
    allowNull: false,
  })
  declare status: number;

  /** Identifiant du contrat de base associé au statement */
  @ForeignKey(() => Contract)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare contract_id;

  @BelongsTo(() => Contract, "contract_id")
  declare contract: Contract;

  /** Option part of the option */
  @BelongsTo(() => OptionContract, "contract_id")
  declare option: OptionContract;
}
