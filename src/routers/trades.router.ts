import express from "express";
import { Op } from "sequelize";
import { PositionEntry } from ".";
import logger, { LogLevel } from "../logger";
import { Contract, Portfolio, Position, Statement, Trade } from "../models";
import { TradeStatus } from "../models/types";
import { preparePositions } from "./positions.router";
import { OpenTradesWithPositions, TradeEntry } from "./trades.types";
import {
  addFakeTrades,
  makeSynthesys,
  prepareTrades,
  tradeModelToTradeEntry,
  updateTradeDetails,
} from "./trades.utils";

const MODULE = "TradesRouter";

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unused-vars
const sequelize_logging = (...args: any[]): void => logger.trace(MODULE + ".squelize", ...args);

const router = express.Router({ mergeParams: true });

interface parentParams {
  portfolioId: number;
}

/* +++++ Routes +++++ */

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
      status: TradeStatus.closed,
    },
    include: [{ model: Contract, as: "underlying" }],
  })
    .then(async (trades: Trade[]) => makeSynthesys(trades))
    .then((tradessynthesys) => res.status(200).json({ tradessynthesys }))
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".SummaryAll", undefined, error);
      res.status(500).json({ error });
    });
});

/**
 * Get 12M closed trades history synthesys
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
        [Op.gte]: new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()),
      },
      // status: TradeStatus.closed,
    },
    include: [{ model: Contract, as: "underlying" }],
    // limit: 500,
  })
    .then(async (trades: Trade[]) => makeSynthesys(trades))
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
        [Op.gte]: new Date(new Date().getFullYear(), 0, 1),
      },
    },
    include: [{ model: Contract, as: "underlying" }],
  })
    .then(async (trades: Trade[]) => makeSynthesys(trades))
    .then((tradessynthesys) => res.status(200).json({ tradessynthesys }))
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".SummaryYtd", undefined, error);
      res.status(500).json({ error });
    });
});

/**
 * Get trades opened and closed during given months
 */
router.get("/closed/:year(\\d+)/:month(\\d+)/opened/:fromyear(\\d+)/:frommonth(\\d+)", (req, res): void => {
  const { portfolioId, year, month, fromyear, frommonth } = req.params as typeof req.params & parentParams;
  const yearval = parseInt(year);
  const monthval = parseInt(month);
  const yearopen = parseInt(fromyear);
  const monthopen = parseInt(frommonth);

  Trade.findAll({
    where: {
      portfolio_id: portfolioId,
      openingDate: {
        [Op.gte]: new Date(yearopen, monthopen - 1, 1),
        [Op.lt]: new Date(monthopen < 12 ? yearopen : yearopen + 1, monthopen < 12 ? monthopen : 0, 1),
      },
      closingDate: {
        [Op.gte]: new Date(yearval, monthval - 1, 1),
        [Op.lt]: new Date(monthval < 12 ? yearval : yearval + 1, monthval < 12 ? monthval : 0, 1),
      },
      status: TradeStatus.closed,
    },
    include: [{ model: Contract, as: "underlying" }, { association: "statements" }],
  })
    .then(async (trades: Trade[]) => prepareTrades(trades))
    .then((trades) => res.status(200).json({ trades }))
    .catch((error) => {
      console.error(error);
      logger.error(MODULE + ".MonthIndex", error);
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
      closingDate: {
        [Op.gte]: new Date(yearval, monthval - 1, 1),
        [Op.lt]: new Date(monthval < 12 ? yearval : yearval + 1, monthval < 12 ? monthval : 0, 1),
      },
      status: TradeStatus.closed,
    },
    include: [{ model: Contract, as: "underlying" }, { association: "statements" }],
  })
    .then(async (trades: Trade[]) => prepareTrades(trades))
    .then((trades) => res.status(200).json({ trades }))
    .catch((error) => {
      console.error(error);
      logger.error(MODULE + ".MonthIndex", error);
      res.status(500).json({ error });
    });
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
      status: TradeStatus.open,
    },
    include: [
      { association: "underlying", required: true },
      { association: "statements", include: [{ association: "stock" }] },
    ],
  })
    .then(async (trades: Trade[]) => prepareTrades(trades))
    .then(async (trades) => {
      return Portfolio.findByPk(portfolioId, {
        include: [
          {
            association: "positions",
            include: [{ association: "contract" }],
          },
          { association: "baseRates" },
        ],
        // logging: console.log,
      })
        .then(async (portfolio) => {
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
    .then((trades) => {
      // console.log(trades);
      return trades;
    })
    .then((trades) => res.status(200).json({ trades }))
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".SummaryOpen", undefined, error);
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
    .then(async (trade) => {
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
      { association: "underlying", required: false },
      {
        association: "statements",
        required: false,
        include: [{ association: "stock", required: false }],
      },
    ],
  })
    .then((trade) => {
      if (trade) {
        trade.status = data.status;
        trade.strategy = data.strategy;
        trade.comment = data.comment ?? "";
        return trade;
      } else throw Error(`trade id ${tradeId} not found!`);
    })
    .then(async (trade) => updateTradeDetails(trade))
    .then(async (trade) => trade.save())
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
    .then(async () =>
      Statement.update({ trade_unit_id: null }, { where: { portfolio_id: portfolioId, trade_unit_id: tradeId } }),
    )
    .then(async () =>
      Trade.findByPk(tradeId, {
        include: [{ model: Statement, as: "statements", required: false, include: [{ model: Contract, as: "stock" }] }],
      }),
    )
    .then(async (trade) => {
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
