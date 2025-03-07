import express from "express";
import { Op } from "sequelize";
import { default as logger, LogLevel } from "../logger";
import {
  Contract,
  DividendStatement,
  EquityStatement,
  FeeStatement,
  InterestStatement,
  OptionStatement,
  Portfolio,
  SalesTaxes,
  Statement,
  TaxStatement,
  Trade,
} from "../models";
import { BondStatement } from "../models/bond_statement.model";
import { CorporateStatement } from "../models/corpo_statement.model";
import { StatementTypes } from "../models/statement.types";
import { TradeStatus, TradeStrategy } from "../models/trade.types";
import { StatementEntry, StatementsSynthesysEntries } from "./statements.types";
import { statementModelToStatementEntry } from "./statements.utils";
import { updateTradeDetails } from "./trades.utils";

const MODULE = "StatementsRouter";

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
const sequelize_logging = (...args: any[]): void => logger.trace(MODULE + ".squelize", ...args);

const router = express.Router({ mergeParams: true });

interface parentParams {
  portfolioId: number;
}

const updateStatementTrade = async (statement: Statement): Promise<Statement> => {
  logger.trace(MODULE + ".updateStatementTrade", "statement", statement);
  if (statement.trade_unit_id) {
    logger.trace(MODULE + ".updateStatementTrade", "trade_unit_id", statement.trade_unit_id);
    return Trade.findByPk(statement.trade_unit_id, {
      include: [
        { model: Contract, as: "underlying" },
        { model: Portfolio, as: "portfolio" },
        { model: Statement, as: "statements" },
        // { model: Position, as: "positions" },
      ],
      logging: sequelize_logging,
    })
      .then(async (thisTrade): Promise<Statement> => {
        logger.trace(MODULE + ".updateStatementTrade", "thisTrade", thisTrade);
        if (thisTrade) return updateTradeDetails(thisTrade).then(() => statement);
        return Promise.resolve(statement);
      })
      .then(async (statement) => {
        return Promise.resolve(statement);
      });
  } else return Promise.resolve(statement);
};

const formatDate = (when: Date): string => {
  const datestr = when.toISOString().substring(0, 7);
  return datestr;
};

const makeSynthesys = async (statements: Statement[]): Promise<StatementsSynthesysEntries> => {
  return statements.reduce(
    async (p: Promise<StatementsSynthesysEntries>, item: Statement) => {
      return p.then(async (value: StatementsSynthesysEntries) => {
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
              return value;
            });

          case StatementTypes.OptionStatement:
            return OptionStatement.findByPk(item.id).then((statement) => {
              value[idx].options += statement ? statement.realizedPnL * item.fxRateToBase : 0;
              value[idx].total += statement ? statement.realizedPnL * item.fxRateToBase : 0;
              return value;
            });

          case StatementTypes.DividendStatement:
          case StatementTypes.TaxStatement:
            value[idx].dividends += item.netCash * item.fxRateToBase;
            value[idx].total += item.netCash * item.fxRateToBase;
            return Promise.resolve(value);

          case StatementTypes.InterestStatement:
            value[idx].interests += item.netCash * item.fxRateToBase;
            value[idx].total += item.netCash * item.fxRateToBase;
            return Promise.resolve(value);

          case StatementTypes.BondStatement:
            return BondStatement.findByPk(item.id).then((statement) => {
              value[idx].total += statement ? statement.realizedPnL * item.fxRateToBase : 0;
              return value;
            });

          case StatementTypes.FeeStatement:
            return FeeStatement.findByPk(item.id).then((_statement) => {
              value[idx].total += item.netCash * item.fxRateToBase;
              return value;
            });

          case StatementTypes.CorporateStatement:
            return CorporateStatement.findByPk(item.id).then((statement) => {
              value[idx].total += statement!.pnl * item.fxRateToBase;
              return value;
            });

          case StatementTypes.CashStatement:
            // Not included in synthesys
            return Promise.resolve(value);

          case StatementTypes.SalesTaxStatement:
            return SalesTaxes.findByPk(item.id).then((_statement) => {
              // Ignored at the moment
              return value;
            });

          default: // Fallback
            logger.log(
              LogLevel.Warning,
              MODULE + ".makeSynthesys",
              undefined,
              "unimplemented statement type",
              item.statementType,
            );
            return Promise.resolve(value);
        }
      });
    },
    Promise.resolve({} as StatementsSynthesysEntries),
  );
};

/* +++++ Routes +++++ */

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
    .then(async (statements: Statement[]): Promise<StatementsSynthesysEntries> => makeSynthesys(statements))
    .then((synthesysentries: StatementsSynthesysEntries) => res.status(200).json({ synthesysentries }))
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".All", undefined, JSON.stringify(error));
      res.status(500).json({ error });
    });
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
    .then(async (statements: Statement[]): Promise<StatementsSynthesysEntries> => makeSynthesys(statements))
    .then((synthesysentries: StatementsSynthesysEntries) => res.status(200).json({ synthesysentries }))
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".YTD", undefined, JSON.stringify(error));
      res.status(500).json({ error });
    });
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
    .then(async (statements: Statement[]): Promise<StatementsSynthesysEntries> => makeSynthesys(statements))
    .then((synthesysentries: StatementsSynthesysEntries) => res.status(200).json({ synthesysentries }))
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".12m", undefined, JSON.stringify(error));
      res.status(500).json({ error });
    });
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
    .then(async (statements: Statement[]): Promise<StatementEntry[]> => {
      return statements.reduce(
        async (p: Promise<StatementEntry[]>, item: Statement) => {
          return p.then(async (value: StatementEntry[]) => {
            return statementModelToStatementEntry(item).then((statement) => {
              value.push(statement);
              return value;
            });
          });
        },
        Promise.resolve([] as StatementEntry[]),
      );
    })
    .then((statemententries: StatementEntry[]) => res.status(200).json({ statemententries }))
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".Month", undefined, JSON.stringify(error));
      res.status(500).json({ error });
    });
});

/**
 * Create a new trade using current statement
 */
router.get("/:statementId(\\d+)/CreateTrade", (req, res): void => {
  const { portfolioId, statementId } = req.params as typeof req.params & parentParams;
  logger.debug(MODULE + ".CreateTrade", portfolioId, statementId);
  Statement.findByPk(statementId, {
    include: [{ model: Contract }, { model: Portfolio }],
  })
    .then(async (statement) => {
      if (statement) {
        const trade = {
          portfolio_id: portfolioId,
          symbol_id: statement.stock.id,
          currency: statement.currency,
          status: TradeStatus.open,
          openingDate: statement.date,
          strategy: TradeStrategy.undefined,
          comment: "",
        };
        return Trade.create(trade, { logging: false }).then(async (trade) => {
          statement.trade_unit_id = trade.id;
          return statement.save();
        });
      } else {
        throw Error("statement doesn't exist");
      }
    })
    .then(async (statement) => updateStatementTrade(statement))
    .then((statement) => res.status(200).json({ statement }))
    .catch((error) => {
      logger.error(MODULE + ".CreateTrade", error);
      res.status(500).json({ error });
    });
});

/**
 * Guess trade of current statement
 */
router.get("/:statementId(\\d+)/GuessTrade", (req, res): void => {
  const { portfolioId, statementId } = req.params as typeof req.params & parentParams;
  logger.log(LogLevel.Info, MODULE + ".GuessTrade", undefined, portfolioId, statementId);
  Statement.findByPk(statementId, {
    include: [{ model: Contract }, { model: Portfolio }],
  })
    .then(async (statement) => {
      if (statement) {
        switch (statement.statementType) {
          case StatementTypes.EquityStatement:
          case StatementTypes.BondStatement:
          case StatementTypes.DividendStatement:
          case StatementTypes.TaxStatement:
          case StatementTypes.InterestStatement:
          case StatementTypes.CorporateStatement:
            logger.log(LogLevel.Info, MODULE + ".GuessTrade", undefined, "equity statement", statement);
            return Statement.findOne({
              where: {
                portfolio_id: portfolioId,
                date: { [Op.lt]: statement.date },
                stock_id: statement.stock.id,
                trade_unit_id: { [Op.gt]: 0 },
              },
              // Find statements related to an open trade
              include: [
                {
                  required: true,
                  model: Trade,
                  as: "trade",
                  where: {
                    status: TradeStatus.open,
                  },
                },
              ],
              order: [["date", "DESC"]],
              logging: sequelize_logging,
            }).then(async (ref) => {
              if (ref) statement.trade_unit_id = ref.trade_unit_id;
              return statement.save();
            });
            break;
          case StatementTypes.OptionStatement:
            return OptionStatement.findByPk(statementId).then(async (optstatement) => {
              logger.log(LogLevel.Info, MODULE + ".GuessTrade", undefined, "guessing for optstatement", optstatement);
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
                  ],
                  order: [["statement", "date", "DESC"]],
                  // logging: console.log,
                }).then(async (refopt) => {
                  if (refopt)
                    return Statement.findByPk(refopt.id).then(async (ref) => {
                      if (ref) {
                        statement.trade_unit_id = ref?.trade_unit_id;
                      }
                      return statement.save();
                    });
                  else return Promise.resolve(statement);
                });
              } else {
                throw Error("statement not found");
              }
            });
            break;
          default:
            throw Error("invalid statement type: " + statement.statementType);
        }
      } else {
        throw Error("statement doesn't exist");
      }
    })
    .then(async (statement) => updateStatementTrade(statement))
    .then((statement) => res.status(200).json({ statement }))
    .catch((error) => {
      logger.log(LogLevel.Error, MODULE + ".GuessTrade", undefined, error.message);
      res.status(500).json({ error });
    });
});

/**
 * Add a statement to an existing trade
 */
router.get("/:statementId(\\d+)/AddToTrade/:tradeId(\\d+)", (req, res): void => {
  const { portfolioId, statementId, tradeId } = req.params as typeof req.params & parentParams;
  logger.debug(MODULE + ".AddToTrade", portfolioId, statementId, tradeId);
  Statement.findByPk(statementId, {
    include: [{ model: Contract }, { model: Portfolio }],
  })
    .then(async (statement) => {
      if (statement) {
        statement.trade_unit_id = parseInt(tradeId);
        return statement.save();
      } else {
        throw Error("statement doesn't exist");
      }
    })
    .then(async (statement) => updateStatementTrade(statement))
    .then((statement) => res.status(200).json({ statement }))
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".AddToTrade", undefined, JSON.stringify(error));
      res.status(500).json({ error });
    });
});

/**
 * Unlink a statement frim a trade
 */
router.get("/:statementId(\\d+)/UnlinkTrade", (req, res): void => {
  const { _portfolioId, statementId } = req.params as typeof req.params & parentParams;
  Statement.findByPk(statementId)
    .then(async (statement) => {
      if (statement) {
        return statement.update({ trade_unit_id: null });
      } else {
        console.error("statement not found:", statementId);
        throw Error("statement not found: " + statementId);
      }
    })
    .then(async (statement) => updateStatementTrade(statement))
    .then((statement) => res.status(200).json({ statement }))
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".UnlinkTrade", undefined, JSON.stringify(error));
      res.status(500).json({ error });
    });
});

/**
 * Get a statement
 */
router.get("/id/:statementId(\\d+)", (req, res): void => {
  const { _portfolioId, statementId } = req.params as typeof req.params & parentParams;

  Statement.findByPk(statementId, {
    include: [{ model: Contract }, { model: Portfolio }],
  })
    .then((statement) => {
      if (!statement) throw Error("statement doesn't exist");
      return statement;
    })
    .then(async (statement) => statementModelToStatementEntry(statement))
    // .then((statement) => {
    //   console.log("statement", statement);
    //   return statement;
    // })
    .then((statement) => res.status(200).json({ statement }))
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".GetStatement", undefined, JSON.stringify(error));
      res.status(500).json({ error });
    });
});

/**
 * Delete a statement
 */
router.delete("/:statementId(\\d+)/DeleteStatement", (req, res): void => {
  const { _portfolioId, statementId } = req.params as typeof req.params & parentParams;

  Statement.findByPk(statementId)
    .then(async (statement) => {
      if (statement) {
        // console.log(JSON.stringify(statement));
        switch (statement.statementType) {
          case StatementTypes.EquityStatement:
            return statement;
          case StatementTypes.TaxStatement:
            return TaxStatement.destroy({ where: { id: statement.id } }).then((_count) => statement);
          case StatementTypes.DividendStatement:
            return DividendStatement.destroy({ where: { id: statement.id } }).then((_count) => statement);
          case StatementTypes.InterestStatement:
            return InterestStatement.destroy({ where: { id: statement.id } }).then((_count) => statement);
          case StatementTypes.CashStatement:
            return Promise.resolve(statement);
          case StatementTypes.FeeStatement:
            return FeeStatement.destroy({ where: { id: statement.id } }).then((_count) => statement);
          case StatementTypes.OptionStatement:
            return OptionStatement.destroy({ where: { id: statement.id } }).then((_count) => statement);
          case StatementTypes.BondStatement:
            return BondStatement.destroy({ where: { id: statement.id } }).then((_count) => statement);
          default:
            console.error("invalid statement type:", statement.statementType);
            throw Error("invalid statement type: " + statement.statementType);
        }
      } else {
        console.error("statement not found:", statementId);
        throw Error("statement not found: " + statementId);
      }
    })
    .then(async (statement) => {
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
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".DeleteStatement", undefined, JSON.stringify(error));
      res.status(500).json({ error });
    });
});

/**
 * Save a statement
 */
router.post("/id/:statementId(\\d+)/SaveStatement", (req, res): void => {
  const { _portfolioId, statementId } = req.params as typeof req.params & parentParams;
  const data = req.body as StatementEntry;

  Statement.findByPk(statementId)
    .then(async (statement) => {
      if (statement)
        return statement
          .update({
            trade_unit_id: data.trade_id || null,
            statementType: data.statementType,
            description: data.description,
          })
          .then(async (_statement) => {
            switch (data.statementType) {
              case StatementTypes.BondStatement:
                return BondStatement.update({ country: data.country }, { where: { id: statementId } });
              case StatementTypes.InterestStatement:
                return InterestStatement.update({ country: data.country! }, { where: { id: statementId } });
              case StatementTypes.TaxStatement:
                return TaxStatement.update({ country: data.country }, { where: { id: statementId } });
              case StatementTypes.OptionStatement:
                return OptionStatement.update({ quantity: data.quantity }, { where: { id: statementId } });
              default:
                return [0];
            }
          })
          .then(() => statement);
      else throw Error("statement not found");
    })
    .then((statement) => res.status(200).json({ statement }))
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".SaveStatement", undefined, JSON.stringify(error), data);
      res.status(500).json({ error });
    });
});

export default router;
