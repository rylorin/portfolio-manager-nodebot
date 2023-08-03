import { OptionType } from "@stoqey/ib";
import express from "express";
import { Op } from "sequelize";
import logger, { LogLevel } from "../logger";
import { Contract, ContractType, Currency, Portfolio, Position, Statement, StatementTypes, Trade } from "../models";
import { expirationToDate } from "../models/date_utils";
import { TradeStatus, TradeStrategy } from "../models/trade.types";
import { preparePositions } from "./positions.router";
import { OptionPositionEntry, PositionEntry } from "./positions.types";
import { statementModelToStatementEntry } from "./statements.router";
import { StatementEntry, StatementOptionEntry, StatementUnderlyingEntry } from "./statements.types";
import {
  OpenTradesWithPositions,
  TradeEntry,
  TradeMonthlySynthesys,
  TradeSynthesys,
  VirtualPositionEntry,
} from "./trades.types";

const MODULE = "TradesRouter";
const _sequelize_logging = (...args: any[]): void => logger.trace(MODULE + ".squelize", ...args);

const router = express.Router({ mergeParams: true });

type parentParams = { portfolioId: number };

/**
 * Build virtual positions from statements
 * @param statements
 * @returns
 */
const makeVirtualPositions = (statements: StatementEntry[] | undefined): Record<number, VirtualPositionEntry> => {
  const virtuals: Record<number, VirtualPositionEntry> = {};
  statements?.forEach((item) => {
    switch (item.type) {
      case StatementTypes.EquityStatement:
        if (item.underlying && item.quantity) {
          if (virtuals[item.underlying.id]) virtuals[item.underlying.id].quantity += item.quantity;
          else
            virtuals[item.underlying.id] = {
              id: -item.underlying.id,
              openDate: item.date,
              quantity: item.quantity,
              contract: item.underlying,
              trade_id: item.trade_id!,
            } as VirtualPositionEntry;
        }
        break;
      case StatementTypes.OptionStatement:
        if (item.option && item.quantity) {
          if (virtuals[item.option.id]) virtuals[item.option.id].quantity += item.quantity;
          else
            virtuals[item.option.id] = {
              id: -item.option.id,
              openDate: item.date,
              quantity: item.quantity,
              contract: item.option,
              trade_id: item.trade_id!,
            } as VirtualPositionEntry;
        }
        break;
    }
  });
  return virtuals;
};

/**
 * Given the strategy and the statements we can update trade risk
 *
 */
const updateTradeRisk = (thisTrade: Trade, statements: StatementEntry[]): StatementEntry[] => {
  const virtuals: Record<number, { contract: StatementUnderlyingEntry | StatementOptionEntry; risk: number }> = {};
  switch (thisTrade.strategy) {
    case TradeStrategy["short put"]:
    case TradeStrategy["the wheel"]:
      // risk = quantity * strike * multiplier of puts minus premium for the first one
      thisTrade.risk = 0;
      for (let i = 0; i < statements.length; i++) {
        const statement_entry = statements[i];
        if (
          statement_entry.type == StatementTypes.OptionStatement &&
          statement_entry.option!.callOrPut == OptionType.Put
        ) {
          const risk = statement_entry.quantity! * statement_entry.option!.strike * statement_entry.option!.multiplier;
          if (virtuals[statement_entry.option!.id]) virtuals[statement_entry.option!.id].risk += risk;
          else
            virtuals[statement_entry.option!.id] = {
              contract: statement_entry.option!,
              risk,
            };
          // Adjust with premium for the first position
          if (Object.keys(virtuals).length == 1) virtuals[statement_entry.option!.id].risk += statement_entry.amount;
          const consolidated_risk = Object.values(virtuals).reduce((p, item) => (p += item.risk), 0);
          logger.log(
            LogLevel.Trace,
            MODULE + ".updateTradeRisk",
            thisTrade.underlying?.symbol,
            "virtuals",
            virtuals,
            consolidated_risk,
          );
          thisTrade.risk = Math.min(thisTrade.risk, consolidated_risk);
        }
      }
      break;
    case TradeStrategy["long stock"]:
      // risk = price paid
      thisTrade.risk = 0;
      for (let i = 0; i < statements.length; i++) {
        const statement_entry = statements[i];
        if (statement_entry.type == StatementTypes.EquityStatement) {
          const risk = statement_entry.amount;
          if (virtuals[statement_entry.underlying!.id]) virtuals[statement_entry.underlying!.id].risk += risk;
          else
            virtuals[statement_entry.underlying!.id] = {
              contract: statement_entry.underlying!,
              risk,
            };
          const consolidated_risk = Object.values(virtuals).reduce((p, item) => (p += item.risk), 0);
          logger.log(
            LogLevel.Trace,
            MODULE + ".updateTradeRisk",
            thisTrade.underlying?.symbol,
            "virtuals",
            virtuals,
            consolidated_risk,
          );
          thisTrade.risk = Math.min(thisTrade.risk, consolidated_risk);
        }
      }
      break;
  }
  return statements;
};

const updateTradeStrategy = (thisTrade: Trade, statements: StatementEntry[]): StatementEntry[] => {
  logger.log(LogLevel.Trace, MODULE + ".updateTradeStrategy", thisTrade.underlying?.symbol, "statements", statements);
  // Update trade stategy
  for (let i = 0; i < statements.length; i++) {
    const statement_entry = statements[i];
    switch (thisTrade.strategy) {
      case TradeStrategy.undefined:
        if (statement_entry.type == StatementTypes.EquityStatement) {
          if (statement_entry.quantity! < 0) thisTrade.strategy = TradeStrategy["short stock"];
          else thisTrade.strategy = TradeStrategy["long stock"];
        } else if (statement_entry.type == StatementTypes.OptionStatement) {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
          if (statement_entry.option!.callOrPut == OptionType.Put) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            if (statement_entry.quantity! < 0) thisTrade.strategy = TradeStrategy["short put"];
            else thisTrade.strategy = TradeStrategy["long put"];
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
          } else if (statement_entry.option!.callOrPut == OptionType.Call) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            if (statement_entry.quantity! < 0) thisTrade.strategy = TradeStrategy["covered short call"];
            else thisTrade.strategy = TradeStrategy["long call"];
          }
        }
        break;

      case TradeStrategy["short put"]:
        // if the short put is followed by a long stock and short call then it's a wheel
        for (let j = i; j < statements.length; j++) {
          const statement_entry = statements[j];
          if (statement_entry.type == StatementTypes.EquityStatement && statement_entry.quantity! > 0) {
            for (let k = j; k < statements.length; k++) {
              const statement_entry = statements[k];
              if (
                statement_entry.type == StatementTypes.OptionStatement &&
                statement_entry.option!.callOrPut == OptionType.Call &&
                statement_entry.quantity! < 0
              ) {
                thisTrade.strategy = TradeStrategy["the wheel"];
              }
            }
          }
        }
        break;
    }
  }
  return statements;
};

const updateTradeExpiry = (thisTrade: Trade, statements: StatementEntry[]): StatementEntry[] => {
  // Compute expected expiry
  const virtuals = makeVirtualPositions(statements);
  thisTrade.expectedExpiry = null;
  // thisTrade.changed("expectedExpiry", true); // force update

  Object.values(virtuals).forEach((pos) => {
    // console.log("xxx", thisTrade.expectedExpiry);
    if (pos.contract.secType == ContractType.Option && pos.quantity) {
      if (!thisTrade.expectedExpiry) thisTrade.expectedExpiry = (pos.contract as StatementOptionEntry).lastTradeDate;
      else if (thisTrade.expectedExpiry < (pos.contract as StatementOptionEntry).lastTradeDate)
        thisTrade.expectedExpiry = (pos.contract as StatementOptionEntry).lastTradeDate;
      // console.log("yyy", thisTrade.expectedExpiry, (pos.contract as StatementOptionEntry).lastTradeDate);
    }
  });
  return statements;
};

const prepareStatements = (statements: Statement[]): Promise<StatementEntry[]> => {
  return statements.reduce(
    (p, item) =>
      p.then((statements) => {
        return statementModelToStatementEntry(item).then((statement_entry) => {
          statements.push(statement_entry);
          return statements;
        });
      }),
    Promise.resolve([] as StatementEntry[]),
  );
};

const updateRealizedPnl = (thisTrade: Trade, statements: StatementEntry[]): StatementEntry[] => {
  statements.forEach((statement_entry) => {
    if (statement_entry.pnl) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      thisTrade.PnL! += statement_entry.pnl;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      thisTrade.pnlInBase! += statement_entry.pnl * statement_entry.fxRateToBase;
    }
  });
  return statements;
};

/**
 * updateTradeDetails automatically update some trade's details
 * @param thisTrade
 * @returns
 */
export const updateTradeDetails = (thisTrade: Trade): Promise<Trade> => {
  logger.log(LogLevel.Trace, MODULE + ".updateTradeDetails", thisTrade.underlying?.symbol, "thisTrade", thisTrade);
  if (thisTrade && thisTrade.statements?.length) {
    // sort statements by date
    const items = thisTrade.statements.sort((a, b) => a.date.getTime() - b.date.getTime());
    thisTrade.openingDate = items[0].date;
    if (thisTrade.status == TradeStatus.closed && !thisTrade.closingDate)
      thisTrade.closingDate = items[items.length - 1].date;
    else if (thisTrade.status != TradeStatus.closed) thisTrade.closingDate = undefined;
    thisTrade.PnL = 0;
    thisTrade.pnlInBase = 0;
    return prepareStatements(items) // Convert Statement[] to StatementEntry[]
      .then((statements) => updateRealizedPnl(thisTrade, statements))
      .then((statements) => updateTradeStrategy(thisTrade, statements))
      .then((statements) => updateTradeRisk(thisTrade, statements))
      .then((statements) => updateTradeExpiry(thisTrade, statements))
      .then((_statements) => thisTrade.save());
  }
  return Promise.resolve(thisTrade);
};

/**
 * Convert a trade model to something that is JSONable and easier to manipulate from frontend
 * @param thisTrade
 * @param _options
 * @returns
 */
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
    underlying: thisTrade.underlying,
    currency: thisTrade.currency,
    openingDate: thisTrade.openingDate.getTime(),
    closingDate: thisTrade.closingDate ? thisTrade.closingDate.getTime() : undefined,
    status: thisTrade.status,
    duration: thisTrade.duration,
    expectedExpiry: thisTrade.expectedExpiry,
    expectedDuration: thisTrade.expectedDuration,
    strategy: thisTrade.strategy,
    risk: thisTrade.risk,
    pnl: thisTrade.PnL,
    unrlzdPnl: undefined, // TODO
    pnlInBase: thisTrade.pnlInBase,
    apy: thisTrade.risk && thisTrade.PnL ? (thisTrade.PnL / -thisTrade.risk) * (365 / thisTrade.duration) : undefined,
    comment: thisTrade.comment,
    statements: undefined,
    positions: undefined,
    virtuals: undefined,
  } as TradeEntry)
    .then((trade_entry) => {
      // Add statements
      if (thisTrade.statements) {
        return prepareStatements(thisTrade.statements).then((statements) => {
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
      logger.log(
        LogLevel.Trace,
        MODULE + ".tradeModelToTradeEntry",
        trade_entry.underlying.symbol,
        trade_entry.statements,
      );
      // Add virtual positions from statements entries
      const virtuals = makeVirtualPositions(trade_entry.statements);
      trade_entry.virtuals = Object.values(virtuals);
      return trade_entry;
    });
};

const formatDate = (when: Date): string => {
  const datestr = when.toISOString().substring(0, 7);
  return datestr;
};

/**
 * Create fake trade entries for orphan positions
 * @param theSynthesys
 * @returns
 */
const addFakeTrades = (theSynthesys: OpenTradesWithPositions): TradeEntry[] => {
  theSynthesys.positions = theSynthesys.positions.filter((pos) => !pos.trade_id);
  while (theSynthesys.positions.length) {
    const underlying =
      "stock" in theSynthesys.positions[0]
        ? theSynthesys.positions[0].stock.symbol
        : theSynthesys.positions[0].contract.symbol;
    const currency = theSynthesys.positions[0].contract.currency;
    const positions = theSynthesys.positions.filter(
      (pos) => ("stock" in pos ? pos.stock.symbol : pos.contract.symbol) == underlying,
    );
    // console.log("addFakeTrades", underlying, positions);
    theSynthesys.positions = theSynthesys.positions.filter(
      (pos) => ("stock" in pos ? pos.stock.symbol : pos.contract.symbol) !== underlying,
    );
    let id = 0;
    let openingDate = Date.now();
    let expectedExpiry: string | undefined = undefined;
    let expectedDuration: number | undefined = undefined;
    positions.forEach((pos) => {
      id = Math.min(id, -pos.id);
      openingDate = Math.min(openingDate, pos.openDate);
      if (pos.contract.secType == ContractType.Option) {
        if (!expectedExpiry) expectedExpiry = (pos as OptionPositionEntry).option.expiration;
        else if (expectedExpiry < (pos as OptionPositionEntry).option.expiration)
          expectedExpiry = (pos as OptionPositionEntry).option.expiration;
        expectedDuration = Math.max((expirationToDate(expectedExpiry).getTime() - openingDate) / 1000 / 3600 / 24, 0);
      }
    });
    const duration = (Date.now() - openingDate) / 1000 / 3600 / 24;
    theSynthesys.trades.push({
      id,
      underlying: { id: -1, symbol: underlying, secType: ContractType.Stock, currency },
      currency,
      openingDate,
      status: TradeStatus.open,
      closingDate: undefined,
      duration,
      expectedExpiry,
      expectedDuration,
      strategy: TradeStrategy.undefined,
      risk: undefined,
      pnl: undefined,
      unrlzdPnl: undefined,
      pnlInBase: undefined,
      apy: undefined,
      comment: undefined,
      statements: undefined,
      virtuals: undefined,
      positions,
    } as TradeEntry);
  }
  return theSynthesys.trades;
};

const comparePositions = (a: PositionEntry | OptionPositionEntry, b: PositionEntry | OptionPositionEntry): number => {
  let result: number;
  if (a.contract.secType == ContractType.Stock && b.contract.secType == ContractType.Stock)
    return a.contract.symbol.localeCompare(b.contract.symbol);
  else if (a.contract.secType == ContractType.Stock) return +1;
  else if (b.contract.secType == ContractType.Stock) return -1;
  else if (a.contract.secType == ContractType.Option && b.contract.secType == ContractType.Option) {
    result = (a as OptionPositionEntry).option.expiration.localeCompare((b as OptionPositionEntry).option.expiration);
    if (!result) {
      result = (a as OptionPositionEntry).option.symbol.localeCompare((b as OptionPositionEntry).option.symbol);
      if (!result) result = (a as OptionPositionEntry).option.strike - (b as OptionPositionEntry).option.strike;
    }
    return result;
  } else throw Error("not implemented");
};

// Assume positions inside trades have been sorted
const compareTrades = (a: TradeEntry, b: TradeEntry): number => {
  if (!a.positions!.length && b.positions!.length) return +1;
  else if (a.positions!.length && !b.positions!.length) return -1;
  else if (!a.positions!.length && !b.positions!.length) return 0;
  else return comparePositions(a.positions![0], b.positions![0]);
};

const sortTrades = (trades: TradeEntry[]): TradeEntry[] => {
  trades.forEach((trade) => {
    trade.positions = trade.positions?.sort(comparePositions);
  });
  return trades.sort(compareTrades);
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

const prepareTrades = (trades: Trade[]): Promise<TradeEntry[]> => {
  return trades.reduce(
    (p, item) =>
      p.then((trades) =>
        tradeModelToTradeEntry(item).then((trade) => {
          trades.push(trade);
          return trades;
        }),
      ),
    Promise.resolve([] as TradeEntry[]),
  );
};

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
    include: [{ model: Contract, as: "underlying" }, { association: "statements" }],
  })
    .then((trades: Trade[]) => prepareTrades(trades))
    .then((trades) => res.status(200).json({ trades }))
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Get open trades synthesys
 */
router.get("/summary/open", (req, res): void => {
  const { portfolioId } = req.params as typeof req.params & parentParams;

  Trade.findAll({
    where: {
      portfolio_id: portfolioId,
      openingDate: {
        [Op.gte]: new Date(2021, 0, 1),
      },
      closingDate: {
        [Op.is]: undefined,
      },
    },
    include: [
      { model: Contract, as: "underlying" },
      { association: "statements", include: [{ association: "stock" }] },
    ],
  })
    .then((trades: Trade[]) => prepareTrades(trades))
    .then((trades) => {
      return Portfolio.findByPk(portfolioId, {
        include: [
          {
            model: Position,
            as: "positions",
            include: [{ model: Contract, as: "contract" }],
          },
          { model: Currency, as: "baseRates" },
        ],
        // logging: console.log,
      })
        .then((portfolio) => {
          if (portfolio) {
            return preparePositions(portfolio);
          } else throw Error("Portfolio not found");
        })
        .then((positions: PositionEntry[]) => {
          return {
            trades: trades,
            positions,
          } as OpenTradesWithPositions;
        });
    })
    .then((tradessynthesys) => addFakeTrades(tradessynthesys))
    .then((trades) => sortTrades(trades))
    .then((trades) => res.status(200).json({ trades }))
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".SummaryYtd", undefined, error);
      res.status(500).json({ error });
    });
});

/**
 * Get a single trade
 */
router.get("/id/:tradeId(\\d+)", (req, res): void => {
  const { _portfolioId, tradeId } = req.params as typeof req.params & parentParams;

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
  const { portfolioId, tradeId } = req.params as typeof req.params & parentParams;
  const data = req.body as TradeEntry;
  logger.log(LogLevel.Debug, MODULE + ".SaveTrade", undefined, portfolioId, tradeId, data);

  Trade.findByPk(tradeId, {
    include: [
      { model: Contract, as: "underlying", required: false },
      {
        model: Statement,
        as: "statements",
        required: false,
        include: [{ model: Contract, as: "stock", required: false }],
      },
    ],
  })
    .then((trade) => {
      if (trade) {
        trade.status = data.status;
        trade.strategy = data.strategy;
        trade.comment = data.comment ? data.comment : "";
        return trade;
      } else throw Error(`trade id ${tradeId} not found!`);
    })
    .then((trade) => updateTradeDetails(trade))
    .then((trade) => trade.save())
    .then((trade) => res.status(200).json({ trade }))
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".SaveTrade", undefined, JSON.stringify(error));
      res.status(500).json({ error });
    });
});

/**
 * Delete a trade
 */
router.delete("/id/:tradeId(\\d+)/DeleteTrade", (req, res): void => {
  const { portfolioId, tradeId } = req.params as typeof req.params & parentParams;
  logger.log(LogLevel.Debug, MODULE + ".DeleteTrade", undefined, portfolioId, tradeId);

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
      logger.log(LogLevel.Error, MODULE + ".DeleteTrade", undefined, JSON.stringify(error));
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
