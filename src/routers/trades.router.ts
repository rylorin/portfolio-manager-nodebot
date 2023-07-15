import { OptionType } from "@stoqey/ib";
import express from "express";
import { Op } from "sequelize";
import logger, { LogLevel } from "../logger";
import {
  Contract,
  Option,
  OptionStatement,
  Portfolio,
  Position,
  Statement,
  StatementTypes,
  Trade,
  Trade as TradeModel,
} from "../models";
import { TradeStatus, TradeStrategy } from "../models/trade.types";
import { statementModelToStatementEntry } from "./statements.router";
import { StatementEntry } from "./statements.types";
import { TradeEntry, TradeMonthlySynthesys, TradeSynthesys } from "./trades.types";

const MODULE = "TradesRouter";

const router = express.Router({ mergeParams: true });

type parentParams = { portfolioId: number };

export const updateTradeDetails = (thisTrade: Trade): Promise<Trade> => {
  // sort statements by date
  const items = thisTrade?.statements.sort((a, b) => a.date.getTime() - b.date.getTime());
  if (thisTrade && items?.length) {
    if (!thisTrade.openingDate) thisTrade.openingDate = items[0].date;
    if (thisTrade.status == TradeStatus.closed && !thisTrade.closingDate)
      thisTrade.openingDate = items[items.length - 1].date;
    // thisTrade.PnL=0;
    return items
      .reduce(
        (p, item): Promise<Trade> =>
          p.then((thisTrade) => {
            switch (item.statementType) {
              case StatementTypes.OptionStatement:
                return OptionStatement.findByPk(item.id, {
                  include: [
                    { model: Contract, as: "contract", required: true },
                    { model: Option, as: "option", required: true },
                  ],
                }).then((statement) => {
                  if (statement) {
                    console.log(JSON.stringify(statement));
                    if (!thisTrade.strategy) {
                      if (statement.option.callOrPut == OptionType.Put)
                        if (statement.quantity < 0) thisTrade.strategy = TradeStrategy["short put"];
                        else thisTrade.strategy = TradeStrategy["long put"];
                    }
                    return thisTrade;
                  } else throw Error("Option statement not found. id: " + item.id);
                });
                break;
            }
            return thisTrade;
          }),
        Promise.resolve(thisTrade),
      )
      .then((thisTrade) => thisTrade.save());
  }
  return Promise.resolve(thisTrade);
};

export const tradeModelToTradeEntry = (thisTrade: TradeModel): Promise<TradeEntry> => {
  const apy = thisTrade.risk && thisTrade.PnL ? (thisTrade.PnL / thisTrade.risk / thisTrade.duration) * 365 : undefined;
  const trade: TradeEntry = {
    id: thisTrade.id,
    symbol_id: thisTrade.stock.id,
    symbol: thisTrade.stock.symbol,
    currency: thisTrade.currency,
    openingDate: thisTrade.openingDate.getTime(),
    closingDate: thisTrade.closingDate ? thisTrade.closingDate.getTime() : undefined,
    status: thisTrade.status,
    duration: thisTrade.duration,
    strategy: thisTrade.strategy,
    strategyLabel: TradeStrategy[thisTrade.strategy],
    risk: thisTrade.risk,
    pnl: thisTrade.PnL,
    apy,
    comment: thisTrade.comment,
    statements: undefined,
  };
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
        trade.statements = statements;
        return trade;
      });
  } else return Promise.resolve(trade);
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
          // console.log(JSON.stringify(item));
          // console.log(item.id);
          const idx = formatDate(item.openingDate);
          if (theSynthesys.byMonth[idx] === undefined) {
            theSynthesys.byMonth[idx] = { count: 0, success: 0, duration: 0, min: undefined, max: undefined, total: 0 };
          }
          theSynthesys.byMonth[idx].count += 1;
          theSynthesys.byMonth[idx].duration +=
            (item.closingDate.getTime() - item.openingDate.getTime()) / 1000 / 3600 / 24;
          if (item.PnL) {
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
    include: [{ model: Contract, as: "stock" }],
    // limit: 500,
  })
    .then((trades: Trade[]) => makeSynthesys(trades))
    .then((tradessynthesys) => res.status(200).json({ tradessynthesys }))
    .catch((error) => res.status(500).json({ error }));
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
    include: [{ model: Contract, as: "stock" }],
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
    include: [{ model: Contract, as: "stock" }],
    // limit: 500,
  })
    .then((trades: Trade[]) => makeSynthesys(trades))
    .then((tradessynthesys) => res.status(200).json({ tradessynthesys }))
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Get a trade
 */
router.get("/id/:tradeId(\\d+)", (req, res): void => {
  const { _portfolioId, tradeId } = req.params as typeof req.params & parentParams;
  // console.log("get trade", portfolioId, tradeId);
  Trade.findByPk(tradeId, {
    include: [
      { model: Contract, as: "stock" },
      { model: Portfolio, as: "portfolio" },
      { model: Statement, as: "statements" },
      { model: Position, as: "positions" },
    ],
    // logging: console.log,
  })
    .then((trade) => {
      if (trade) {
        return tradeModelToTradeEntry(trade);
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

  Trade.findByPk(tradeId, { include: [{ model: Statement, as: "statements", required: false }] })
    .then((trade) => {
      // console.log(JSON.stringify(trade));
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
 * Catch all url
 */
router.get("*", (req, _res, next): void => {
  console.log("unknown trades path:", req.path);
  next();
});

export default router;
