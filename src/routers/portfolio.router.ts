import express from "express";
import logger, { LogLevel } from "../logger";
import { Contract, Portfolio } from "../models";
import { PortfolioEntry } from "./";
import balances from "./balances.router";
import contracts from "./contracts.router";
import positions from "./positions.router";
import reports from "./reports.router";
import settings from "./settings.router";
import statements from "./statements.router";
import trades from "./trades.router";

const MODULE = "PortfolioRouter";

const router = express.Router();

/**
 * List portfolios
 */
router.get("/", (_req, res): void => {
  Portfolio.findAll({
    include: {
      model: Contract,
    },
  })
    .then((portfolios: Portfolio[]) => {
      res.status(200).json({ portfolios });
    })
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Fetch a portfolio
 */
router.get("/:portfolioId(\\d+)", (req, res): void => {
  const { portfolioId } = req.params;
  Portfolio.findByPk(portfolioId, {
    include: [
      {
        model: Contract,
      },
      { association: "settings", include: [{ model: Contract, as: "underlying" }], required: false },
    ],
  })
    .then((portfolio: Portfolio) => {
      res.status(200).json({ portfolio });
    })
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".GetPortfolio", undefined, error.msg);
      res.status(500).json({ error });
    });
});

/**
 * Save a portfolio
 */
router.post("/:portfolioId(\\d+)", (req, res): void => {
  const { portfolioId } = req.params;
  const data = req.body as PortfolioEntry;

  Portfolio.findByPk(portfolioId)
    .then(async (portfolio: Portfolio) => {
      if (portfolio) {
        portfolio.benchmark_id = data.benchmark_id;
        portfolio.cashStrategy = data.cashStrategy;
        portfolio.minBenchmarkUnits = data.minBenchmarkUnits;
        return portfolio.save();
      } else throw Error(`Portfolio #${portfolioId} not found!`);
    })
    .then((portfolio) => res.status(200).json({ portfolio }))
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".SavePortfolio", undefined, error.msg);
      res.status(500).json({ error });
    });
});

/**
 * Statements subrouter
 */
router.use("/:portfolioId(\\d+)/statements", statements);

/**
 * Positions subrouter
 */
router.use("/:portfolioId(\\d+)/positions", positions);

/**
 * Balances subrouter
 */
router.use("/:portfolioId(\\d+)/balances", balances);

/**
 * Trades subrouter
 */
router.use("/:portfolioId(\\d+)/trades", trades);

/**
 * Contracts subrouter
 */
router.use("/:portfolioId(\\d+)/contracts", contracts);

/**
 * Reports subrouter
 */
router.use("/:portfolioId(\\d+)/reports", reports);

/**
 * Settings subrouter
 */
router.use("/:portfolioId(\\d+)/settings", settings);

/**
 * Catch all
 */
router.get("*", (req, _res, next): void => {
  console.log("unknown Portfolio path:", req.path);
  next();
});

export default router;
