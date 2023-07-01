import express from "express";
import { Op } from "sequelize";
import {
  Contract,
  DividendStatement,
  EquityStatement,
  FeeStatement,
  InterestStatement,
  OptionStatement,
  Portfolio,
  Statement,
  StatementTypes,
  TaxStatement,
  Trade,
  TradeCreationAttributes,
} from "../models";
import { TradeStatus, TradeStrategy } from "../models/trade.types";
import { StatementEntry, StatementsSynthesysEntries } from "./statements.types";

const router = express.Router({ mergeParams: true });

type parentParams = { portfolioId: number };

const formatDate = (when: Date): string => {
  const datestr = when.toISOString().substring(0, 7);
  return datestr;
};

const makeSynthesys = (statements: Statement[]): Promise<StatementsSynthesysEntries> => {
  return statements.reduce((p: Promise<StatementsSynthesysEntries>, item: Statement) => {
    return p.then((value: StatementsSynthesysEntries) => {
      // console.log('item:', JSON.stringify(item));
      const idx = formatDate(item.date);
      if (value[idx] === undefined) {
        value[idx] = { stocks: 0, options: 0, dividends: 0, interests: 0, total: 0 };
      }
      switch (item.statementType) {
        case StatementTypes.EquityStatement:
          return EquityStatement.findByPk(item.id).then((statement) => {
            value[idx].stocks += statement ? statement.realizedPnL * item.fxRateToBase : 0;
            value[idx].total += statement ? statement.realizedPnL * item.fxRateToBase : 0;
            // console.log(value);
            return value;
          });
          break;
        case StatementTypes.OptionStatement:
          return OptionStatement.findByPk(item.id).then((statement) => {
            value[idx].options += statement ? statement.realizedPnL * item.fxRateToBase : 0;
            value[idx].total += statement ? statement.realizedPnL * item.fxRateToBase : 0;
            // console.log(value);
            return value;
          });
          break;
        case StatementTypes.DividendStatement:
          value[idx].dividends += item.amount * item.fxRateToBase;
          value[idx].total += item.amount * item.fxRateToBase;
          break;
        case StatementTypes.InterestStatement:
          value[idx].interests += item.amount * item.fxRateToBase;
          value[idx].total += item.amount * item.fxRateToBase;
          break;
      }
      // console.log(value);
      return Promise.resolve(value);
    });
  }, Promise.resolve({} as StatementsSynthesysEntries));
};

/**
 * Get statements monthly summary
 */
router.get("/summary/all", (req, res): void => {
  const { portfolioId } = req.params as typeof req.params & parentParams;

  Statement.findAll({
    where: {
      portfolio_id: portfolioId,
      date: {
        [Op.gte]: new Date(2021, 0, 1),
      },
    },
    // limit: 500,
  })
    .then((statements: Statement[]): Promise<StatementsSynthesysEntries> => makeSynthesys(statements))
    .then((synthesysentries: StatementsSynthesysEntries) => res.status(200).json({ synthesysentries }))
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Get YTD statements monthly summary
 */
router.get("/summary/ytd", (req, res): void => {
  const { portfolioId } = req.params as typeof req.params & parentParams;

  Statement.findAll({
    where: {
      portfolio_id: portfolioId,
      date: {
        [Op.gte]: new Date(new Date().getFullYear(), 0, 1),
      },
    },
    // limit: 500,
  })
    .then((statements: Statement[]): Promise<StatementsSynthesysEntries> => makeSynthesys(statements))
    .then((synthesysentries: StatementsSynthesysEntries) => res.status(200).json({ synthesysentries }))
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Get 12M statements monthly summary
 */
router.get("/summary/12m", (req, res): void => {
  const { portfolioId } = req.params as typeof req.params & parentParams;
  const today = new Date();
  Statement.findAll({
    where: {
      portfolio_id: portfolioId,
      date: {
        [Op.gte]: new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()),
      },
    },
    // limit: 500,
  })
    .then((statements: Statement[]): Promise<StatementsSynthesysEntries> => makeSynthesys(statements))
    .then((synthesysentries: StatementsSynthesysEntries) => res.status(200).json({ synthesysentries }))
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Fetch statements for a given month
 */
router.get("/month/:year(\\d+)/:month(\\d+)", (req, res): void => {
  const { portfolioId, year, month } = req.params as typeof req.params & parentParams;
  const yearval = parseInt(year);
  const monthval = parseInt(month);
  Statement.findAll({
    where: {
      portfolio_id: portfolioId,
      date: {
        [Op.gte]: new Date(yearval, monthval - 1, 1),
        [Op.lt]: new Date(monthval < 12 ? yearval : yearval + 1, monthval < 12 ? monthval : 0, 1),
      },
    },
    // limit: 5,
    include: [{ model: Contract }, { model: Portfolio }, { model: Trade }],
  })
    .then((statements: Statement[]): Promise<StatementEntry[]> => {
      return statements.reduce((p: Promise<StatementEntry[]>, item: Statement) => {
        return p.then((value: StatementEntry[]) => {
          // console.log('item:', JSON.stringify(item));
          // console.log('item:', item);
          const thisItem: StatementEntry = {
            id: item.id,
            date: item.date.getTime(),
            type: item.statementType,
            currency: item.currency,
            fxRateToBase: item.fxRateToBase,
            amount: item.amount,
            pnl: undefined,
            fees: undefined,
            underlying: item.stock ? { id: item.stock.id, symbol: item.stock.symbol } : undefined,
            trade_id: item.trade_unit_id,
            description: item.description,
          };
          switch (item.statementType) {
            case StatementTypes.EquityStatement:
              return EquityStatement.findByPk(item.id).then((statement) => {
                // console.log(value);
                thisItem.pnl = statement?.realizedPnL;
                thisItem.fees = statement?.fees;
                value.push(thisItem);
                return value;
              });
              break;
            case StatementTypes.OptionStatement:
              return OptionStatement.findByPk(item.id).then((statement) => {
                thisItem.pnl = statement?.realizedPnL;
                thisItem.fees = statement?.fees;
                value.push(thisItem);
                return value;
              });
              break;
            case StatementTypes.DividendStatement:
              thisItem.pnl = item.amount;
              value.push(thisItem);
              break;
            case StatementTypes.TaxStatement:
              thisItem.pnl = item.amount;
              value.push(thisItem);
              break;
            case StatementTypes.InterestStatement:
              thisItem.pnl = item.amount;
              value.push(thisItem);
              break;
            case StatementTypes.FeeStatement:
              thisItem.fees = item.amount;
              value.push(thisItem);
              break;
            case StatementTypes.CorporateStatement:
              value.push(thisItem);
              break;
            case StatementTypes.CashStatement:
              value.push(thisItem);
              break;
            default:
              throw Error("Undefined statement type: " + item.statementType);
          }
          // console.log(value);
          return Promise.resolve(value);
        });
      }, Promise.resolve([] as StatementEntry[]));
    })
    .then((statemententries: StatementEntry[]) => res.status(200).json({ statemententries }))
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Create a new trade using current statement
 */
router.get("/:statementId(\\d+)/CreateTrade", (req, res): void => {
  const { portfolioId, statementId } = req.params as typeof req.params & parentParams;
  console.log("CreateTrade", portfolioId, statementId);
  Statement.findByPk(statementId, {
    include: [{ model: Contract }, { model: Portfolio }],
  })
    .then((statement) => {
      if (statement) {
        const trade: TradeCreationAttributes = {
          portfolio_id: portfolioId,
          symbol_id: statement.stock.id,
          currency: statement.currency,
          status: TradeStatus.open,
          openingDate: statement.date,
          strategy: TradeStrategy.undefined,
        };
        return Trade.create(trade, { logging: console.log }).then((trade) =>
          statement.update({ trade_unit_id: trade.id }, { logging: console.log }),
        );
      } else {
        throw Error("statement doesn't exist");
      }
    })
    .then((statement) => res.status(200).json({ statement }))
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Guess trade of current statement
 */
router.get("/:statementId(\\d+)/GuessTrade", (req, res): void => {
  const { portfolioId, statementId } = req.params as typeof req.params & parentParams;
  // console.log("GuessTrade", portfolioId, statementId);
  Statement.findByPk(statementId, {
    include: [{ model: Contract }, { model: Portfolio }],
  })
    .then((statement) => {
      if (statement) {
        switch (statement.statementType) {
          case StatementTypes.EquityStatement:
          case StatementTypes.DividendStatement:
          case StatementTypes.TaxStatement:
            // console.log("equity statement", statement);
            return Statement.findOne({
              where: {
                portfolio_id: portfolioId,
                date: { [Op.lt]: statement.date },
                stock_id: statement.stock.id,
                trade_unit_id: { [Op.not]: null },
              },
              order: [["date", "DESC"]],
            }).then((ref) => statement.update({ trade_unit_id: ref?.trade_unit_id }));
            break;
          case StatementTypes.OptionStatement:
            return OptionStatement.findByPk(statementId).then((optstatement) => {
              // console.log("guessing for optstatement", optstatement);
              if (optstatement) {
                return OptionStatement.findOne({
                  where: {
                    contract_id: optstatement.contract_id,
                  },
                  include: [
                    {
                      required: true,
                      model: Statement,
                      as: "statement",
                      where: {
                        portfolio_id: statement.portfolio.id,
                        date: { [Op.lt]: statement.date },
                        stock_id: statement.stock.id,
                        trade_unit_id: { [Op.not]: null },
                      },
                    },
                    // {
                    //   required: true,
                    //   model: Contract,
                    //   as: "contract",
                    // },
                  ],
                  order: [["statement", "date", "DESC"]],
                  // logging: console.log,
                }).then((refopt) => {
                  if (refopt)
                    return Statement.findByPk(refopt.id).then((ref) =>
                      statement.update({ trade_unit_id: ref?.trade_unit_id }),
                    );
                  else return Promise.resolve(statement);
                });
              } else {
                throw Error("statement not found");
              }
            });
            break;
          default:
            throw Error("invalid statement type");
        }
      } else {
        throw Error("statement doesn't exist");
      }
    })
    .then((statement) => res.status(200).json({ statement }))
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Add a statement to an existing trade
 */
router.get("/:statementId(\\d+)/AddToTrade/:tradeId(\\d+)", (req, res): void => {
  const { _portfolioId, statementId, tradeId } = req.params as typeof req.params & parentParams;
  // console.log("CreateTrade", portfolioId, statementId);
  Statement.findByPk(statementId, {
    include: [{ model: Contract }, { model: Portfolio }],
  })
    .then((statement) => {
      if (statement) {
        return statement.update({ trade_unit_id: tradeId });
      } else {
        throw Error("statement doesn't exist");
      }
    })
    .then((statement) => res.status(200).json({ statement }))
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Delete a statement
 */
router.get("/:statementId(\\d+)/UnlinkTrade", (req, res): void => {
  const { _portfolioId, statementId } = req.params as typeof req.params & parentParams;
  Statement.findByPk(statementId)
    .then((statement) => {
      if (statement) {
        return statement.update({ trade_unit_id: null });
      } else {
        console.error("statement not found:", statementId);
        throw Error("statement not found: " + statementId);
      }
    })
    .then((statement) => res.status(200).json({ statement }))
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Get a statement
 */
router.get("/id/:statementId(\\d+)", (req, res): void => {
  const { portfolioId, statementId } = req.params as typeof req.params & parentParams;
  console.log("statement", portfolioId, statementId);
  Statement.findByPk(statementId, {
    include: [{ model: Contract }, { model: Portfolio }],
  })
    .then((statement) => {
      if (statement) {
        return statement;
      } else {
        throw Error("statement doesn't exist");
      }
    })
    .then((statement) => res.status(200).json({ statement }))
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Delete a statement
 */
router.get("/:statementId(\\d+)/DeleteStatement", (req, res): void => {
  const { _portfolioId, statementId } = req.params as typeof req.params & parentParams;

  Statement.findByPk(statementId)
    .then((statement) => {
      if (statement) {
        // console.log(JSON.stringify(statement));
        switch (statement.statementType) {
          case StatementTypes.TaxStatement:
            return TaxStatement.destroy({ where: { id: statement.id } }).then((_count) => statement);
            break;
          case StatementTypes.DividendStatement:
            return DividendStatement.destroy({ where: { id: statement.id } }).then((_count) => statement);
            break;
          case StatementTypes.InterestStatement:
            return InterestStatement.destroy({ where: { id: statement.id } }).then((_count) => statement);
            break;
          case StatementTypes.CashStatement:
            return Promise.resolve(statement);
            break;
          case StatementTypes.FeeStatement:
            return FeeStatement.destroy({ where: { id: statement.id } }).then((_count) => statement);
            break;
          case StatementTypes.OptionStatement:
            return OptionStatement.destroy({ where: { id: statement.id } }).then((_count) => statement);
            break;
          default:
            console.error("invalid statement type:", statement.statementType);
            throw Error("invalid statement type: " + statement.statementType);
        }
      } else {
        console.error("statement not found:", statementId);
        throw Error("statement not found: " + statementId);
      }
    })
    .then((statement) => {
      if (statement) {
        // console.log("deleteing statement", statement.id);
        return Statement.destroy({ where: { id: statementId } });
      } else {
        console.error("statement not found:", statementId);
        throw Error("statement doesn't exist");
      }
    })
    .then((_count) => {
      // console.log("statement deleted");
      res.status(200).end();
    })
    .catch((error) => res.status(500).json({ error }));
});

export default router;
