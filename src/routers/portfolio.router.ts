import express from "express";
import logger, { LogLevel } from "../logger";
import { Contract, Portfolio } from "../models";
import { Setting } from "../models/setting.model";
import balances from "./balances.router";
import contracts from "./contracts.router";
import positions from "./positions.router";
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
      { model: Setting, as: "settings", include: [{ model: Contract, as: "underlying", required: false }] },
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
 * Catch all
 */
router.get("*", (req, _res, next): void => {
  console.log("unknown Portfolio path:", req.path);
  next();
});

export default router;
