import { OptionType } from "@stoqey/ib";
import express from "express";
import { Op } from "sequelize";
import logger, { LogLevel } from "../logger";
import { Contract, Currency, Portfolio, Position, Statement, StatementTypes, Trade } from "../models";
import { TradeStatus, TradeStrategy } from "../models/trade.types";
import { preparePositions } from "./positions.router";
import { statementModelToStatementEntry } from "./statements.router";
import { StatementEntry } from "./statements.types";
import { TradeEntry, TradeMonthlySynthesys, TradeSynthesys, VirtualPositionEntry } from "./trades.types";

const MODULE = "TradesRouter";

const router = express.Router({ mergeParams: true });

type parentParams = { portfolioId: number };

export const updateTradeDetails = (thisTrade: Trade): Promise<Trade> => {
  if (thisTrade && thisTrade.statements?.length) {
    // sort statements by date
    const items = thisTrade.statements.sort((a, b) => a.date.getTime() - b.date.getTime());
    thisTrade.openingDate = items[0].date;
    if (thisTrade.status == TradeStatus.closed && !thisTrade.closingDate)
      thisTrade.closingDate = items[items.length - 1].date;
    thisTrade.PnL = 0;
    thisTrade.pnlInBase = 0;
    return items
      .reduce(
        (p, item): Promise<Trade> =>
          p.then((thisTrade) => {
            let risk = 0;
            thisTrade.risk = 0;
            return statementModelToStatementEntry(item).then((statement_entry) => {
              switch (statement_entry.type) {
                case StatementTypes.EquityStatement:
                  risk += statement_entry.amount;
                  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
                  thisTrade.risk = Math.max(Math.abs(risk), thisTrade.risk!);
                  break;
                case StatementTypes.OptionStatement:
                  if (!thisTrade.strategy) {
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
                    if (statement_entry.option!.callOrPut == OptionType.Put) {
                      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
                      if (statement_entry.quantity! < 0) thisTrade.strategy = TradeStrategy["short put"];
                      else thisTrade.strategy = TradeStrategy["long put"];
                    }
                  }
                  risk += // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
                    statement_entry.option!.strike * statement_entry.option!.multiplier * statement_entry.quantity!;
                  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
                  thisTrade.risk = Math.max(Math.abs(risk), thisTrade.risk!);
                  break;
              }
              if (statement_entry.pnl) {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
                thisTrade.PnL! += statement_entry.pnl;
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
                thisTrade.pnlInBase! += statement_entry.pnl * statement_entry.fxRateToBase;
              }
              return thisTrade;
            });
          }),
        Promise.resolve(thisTrade),
      )
      .then((thisTrade) => thisTrade.save());
  }
  return Promise.resolve(thisTrade);
};

export const tradeModelToTradeEntry = (
  thisTrade: Trade,
  _options: { with_statements: boolean; with_positions: boolean; with_virtuals: boolean } = {
    with_statements: false,
    with_positions: false,
    with_virtuals: false,
  },
): Promise<TradeEntry> => {
  // Init TradeEntry
  return Promise.resolve({
    id: thisTrade.id,
    underlying: {
      symbol_id: thisTrade.underlying.id,
      symbol: thisTrade.underlying.symbol,
    },
    currency: thisTrade.currency,
    openingDate: thisTrade.openingDate.getTime(),
    closingDate: thisTrade.closingDate ? thisTrade.closingDate.getTime() : undefined,
    status: thisTrade.status,
    duration: thisTrade.duration,
    strategy: thisTrade.strategy,
    risk: thisTrade.risk,
    pnl: thisTrade.PnL,
    pnlInBase: thisTrade.pnlInBase,
    apy: thisTrade.risk && thisTrade.PnL ? (thisTrade.PnL / thisTrade.risk / thisTrade.duration) * 365 : undefined,
    comment: thisTrade.comment,
    statements: undefined,
    positions: undefined,
    virtuals: undefined,
  } as TradeEntry)
    .then((trade_entry) => {
      // Add statements
      if (thisTrade.statements) {
        return thisTrade.statements
          .reduce(
            (p, item): Promise<StatementEntry[]> => {
              return p.then((statements) => {
                return statementModelToStatementEntry(item).then((statement) => {
                  statements.push(statement);
                  return statements;
                });
              });
            },
            Promise.resolve([] as StatementEntry[]),
          )
          .then((statements) => {
            trade_entry.statements = statements;
            return trade_entry;
          });
      } else return trade_entry;
    })
    .then((trade_entry) => {
      // Add positions
      return Portfolio.findByPk(thisTrade.portfolio_id, {
        include: [
          {
            model: Position,
            as: "positions",
            where: { trade_unit_id: thisTrade.id },
            include: [{ model: Contract, as: "contract" }],
            required: false,
          },
          { model: Currency, as: "baseRates" },
        ],
      }).then((portfolio) => {
        if (!portfolio) throw Error("portfolio not found: " + thisTrade.portfolio_id);
        return preparePositions(portfolio).then((positions) => {
          trade_entry.positions = positions;
          return trade_entry;
        });
      });
    })
    .then((trade_entry) => {
      // Add virtual positions
      const virtuals: Record<number, VirtualPositionEntry> = {};
      trade_entry.statements?.forEach((item) => {
        switch (item.type) {
          case StatementTypes.EquityStatement:
            if (item.underlying && item.quantity) {
              if (virtuals[item.underlying.id]) virtuals[item.underlying.id].quantity += item.quantity;
              else
                virtuals[item.underlying.id] = {
                  contract_id: item.underlying.id,
                  symbol: item.underlying.symbol,
                  quantity: item.quantity,
                };
            }
            break;
          case StatementTypes.OptionStatement:
            if (item.option && item.quantity) {
              if (virtuals[item.option.id]) virtuals[item.option.id].quantity += item.quantity;
              else
                virtuals[item.option.id] = {
                  contract_id: item.option.id,
                  symbol: item.option.symbol,
                  quantity: item.quantity,
                };
            }
            break;
        }
      });
      // console.log(Object.values(virtuals));
      trade_entry.virtuals = Object.values(virtuals);
      return trade_entry;
    });
};

const formatDate = (when: Date): string => {
  const datestr = when.toISOString().substring(0, 7);
  return datestr;
};

function makeSynthesys(trades: Trade[]): Promise<TradeSynthesys> {
  return trades.reduce(
    (p, item) =>
      p.then((theSynthesys) => {
        if (item.closingDate) {
          const idx = formatDate(item.openingDate);
          if (theSynthesys.byMonth[idx] === undefined) {
            theSynthesys.byMonth[idx] = { count: 0, success: 0, duration: 0, min: undefined, max: undefined, total: 0 };
          }
          theSynthesys.byMonth[idx].count += 1;
          theSynthesys.byMonth[idx].duration +=
            (item.closingDate.getTime() - item.openingDate.getTime()) / 1000 / 3600 / 24;
          if (item.pnlInBase) {
            if (item.pnlInBase > 0) theSynthesys.byMonth[idx].success += 1;
            theSynthesys.byMonth[idx].total += item.pnlInBase;
            theSynthesys.byMonth[idx].min = theSynthesys.byMonth[idx].min
              ? Math.min(theSynthesys.byMonth[idx].min, item.pnlInBase)
              : item.pnlInBase;
            theSynthesys.byMonth[idx].max = theSynthesys.byMonth[idx].max
              ? Math.max(theSynthesys.byMonth[idx].max, item.pnlInBase)
              : item.pnlInBase;
          } else if (item.PnL) {
            // TODO: multiply by baseRate
            if (item.PnL > 0) theSynthesys.byMonth[idx].success += 1;
            theSynthesys.byMonth[idx].total += item.PnL;
            theSynthesys.byMonth[idx].min = theSynthesys.byMonth[idx].min
              ? Math.min(theSynthesys.byMonth[idx].min, item.PnL)
              : item.PnL;
            theSynthesys.byMonth[idx].max = theSynthesys.byMonth[idx].max
              ? Math.max(theSynthesys.byMonth[idx].max, item.PnL)
              : item.PnL;
          }
          return theSynthesys;
        } else {
          return tradeModelToTradeEntry(item).then((trade) => {
            theSynthesys.open.push(trade);
            return theSynthesys;
          });
        }
      }),
    Promise.resolve({ open: [], byMonth: {} as TradeMonthlySynthesys } as TradeSynthesys),
  );
}

/**
 * Get full trades history synthesys
 */
router.get("/summary/all", (req, res): void => {
  const { portfolioId } = req.params as typeof req.params & parentParams;

  Trade.findAll({
    where: {
      portfolio_id: portfolioId,
      openingDate: {
        [Op.gte]: new Date(2021, 0, 1),
      },
    },
    include: [{ model: Contract, as: "underlying" }],
    // limit: 500,
  })
    .then((trades: Trade[]) => makeSynthesys(trades))
    .then((tradessynthesys) => res.status(200).json({ tradessynthesys }))
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".SummaryAll", undefined, error);
      res.status(500).json({ error });
    });
});

/**
 * Get 12M trades history synthesys
 */
router.get("/summary/12m", (req, res): void => {
  const { portfolioId } = req.params as typeof req.params & parentParams;
  const today = new Date();

  Trade.findAll({
    where: {
      portfolio_id: portfolioId,
      openingDate: {
        [Op.gte]: new Date(2021, 0, 1),
      },
      closingDate: {
        [Op.or]: {
          [Op.gte]: new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()),
          [Op.is]: undefined,
        },
      },
    },
    include: [{ model: Contract, as: "underlying" }],
    // limit: 500,
  })
    .then((trades: Trade[]) => makeSynthesys(trades))
    .then((tradessynthesys) => res.status(200).json({ tradessynthesys }))
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Get YTD trades history synthesys
 */
router.get("/summary/ytd", (req, res): void => {
  const { portfolioId } = req.params as typeof req.params & parentParams;

  Trade.findAll({
    where: {
      portfolio_id: portfolioId,
      openingDate: {
        [Op.gte]: new Date(2021, 0, 1),
      },
      closingDate: {
        [Op.or]: {
          [Op.gte]: new Date(new Date().getFullYear(), 0, 1),
          [Op.is]: undefined,
        },
      },
    },
    include: [{ model: Contract, as: "underlying" }],
    // limit: 500,
  })
    .then((trades: Trade[]) => makeSynthesys(trades))
    .then((tradessynthesys) => res.status(200).json({ tradessynthesys }))
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".SummaryYtd", undefined, error);
      res.status(500).json({ error });
    });
});

/**
 * Get trades closed during a given month
 */
router.get("/month/:year(\\d+)/:month(\\d+)", (req, res): void => {
  const { portfolioId, year, month } = req.params as typeof req.params & parentParams;
  const yearval = parseInt(year);
  const monthval = parseInt(month);

  Trade.findAll({
    where: {
      portfolio_id: portfolioId,
      openingDate: {
        [Op.gte]: new Date(yearval, monthval - 1, 1),
        [Op.lt]: new Date(monthval < 12 ? yearval : yearval + 1, monthval < 12 ? monthval : 0, 1),
      },
      status: TradeStatus.closed,
    },
    include: [{ model: Contract, as: "underlying" }],
    // limit: 500,
  })
    .then((trades: Trade[]) =>
      trades.reduce(
        (p, item) =>
          p.then((trades) =>
            tradeModelToTradeEntry(item).then((trade) => {
              trades.push(trade);
              return trades;
            }),
          ),
        Promise.resolve([] as TradeEntry[]),
      ),
    )
    .then((trades) => res.status(200).json({ trades }))
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Get a single trade
 */
router.get("/id/:tradeId(\\d+)", (req, res): void => {
  const { _portfolioId, tradeId } = req.params as typeof req.params & parentParams;
  // console.log("get trade", portfolioId, tradeId);
  Trade.findByPk(tradeId, {
    include: [
      { model: Contract, as: "underlying" },
      { model: Portfolio, as: "portfolio" },
      { model: Statement, as: "statements", include: [{ model: Contract, as: "stock" }] },
      { model: Position, as: "positions", include: [{ model: Contract, as: "contract" }] },
    ],
    // logging: console.log,
  })
    .then((trade) => {
      if (trade) {
        return tradeModelToTradeEntry(trade, { with_statements: true, with_positions: true, with_virtuals: true });
      } else {
        throw Error("trade doesn't exist");
      }
    })
    .then((trade) => {
      // console.log(trade);
      res.status(200).json({ trade });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({ error });
    });
});

/**
 * Save a trade
 */
router.post("/id/:tradeId(\\d+)/SaveTrade", (req, res): void => {
  const { _portfolioId, tradeId } = req.params as typeof req.params & parentParams;
  const data = req.body as TradeEntry;

  Trade.findByPk(tradeId, {
    include: [{ model: Statement, as: "statements", required: false, include: [{ model: Contract, as: "stock" }] }],
  })
    .then((trade) => {
      if (trade)
        return trade.update({
          status: data.status,
          strategy: data.strategy,
          risk: data.risk,
          comment: data.comment,
        });
      else throw Error("trade not found");
    })
    .then((trade) => updateTradeDetails(trade))
    .then((trade) => res.status(200).json({ trade }))
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".SaveTrade", undefined, error);
      res.status(500).json({ error });
    });
});

/**
 * Delete a trade
 */
router.delete("/id/:tradeId(\\d+)/DeleteTrade", (req, res): void => {
  const { portfolioId, tradeId } = req.params as typeof req.params & parentParams;
  logger.log(LogLevel.Debug, MODULE + ".SaveTrade", undefined, portfolioId, tradeId);

  Position.update({ trade_unit_id: null }, { where: { portfolio_id: portfolioId, trade_unit_id: tradeId } })
    .then(() =>
      Statement.update({ trade_unit_id: null }, { where: { portfolio_id: portfolioId, trade_unit_id: tradeId } }),
    )
    .then(() =>
      Trade.findByPk(tradeId, {
        include: [{ model: Statement, as: "statements", required: false, include: [{ model: Contract, as: "stock" }] }],
      }),
    )
    .then((trade) => {
      if (trade) return trade.destroy();
      else throw Error("trade not found");
    })
    .then(() => res.status(200).end())
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".SaveTrade", undefined, error);
      res.status(500).json({ error });
    });
});

/**
 * Catch all url
 */
router.get("*", (req, _res, next): void => {
  console.log("unknown trades path:", req.path);
  next();
});

export default router;
