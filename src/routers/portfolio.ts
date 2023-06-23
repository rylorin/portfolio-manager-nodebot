import express from "express";
import { Contract, Portfolio } from "../models";
import balances from "./balance";
import positions from "./position";
import statements from "./statement";
import trades from "./trade";

const router = express.Router();

/**
 * List portfolios
 */
router.get("/", (_req, res): Promise<void> => {
  return Portfolio.findAll({
    include: {
      model: Contract,
    },
  }).then((portfolios: Portfolio[]) => {
    res.status(200).json({ portfolios });
  });
});

/**
 * Fetch a portfolio
 */
router.get("/:portfolioId(\\d+)", (req, res): Promise<void> => {
  return Portfolio.findByPk(req.params.portfolioId, {
    include: {
      model: Contract,
    },
  }).then((portfolio: Portfolio) => {
    res.status(200).json({ portfolio });
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
 * Catch all
 */
router.get("*", (req, _res, next): void => {
  console.log("unknown Portfolio path:", req.path);
  next();
});

export default router;
