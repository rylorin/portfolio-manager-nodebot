import { default as express } from "express";
import logger, { LogLevel } from "../logger";
import { Balance, Currency, Portfolio } from "../models";
import { BalanceEntry } from "./balances.types";

const MODULE = "StatementsRouter";

const router = express.Router({ mergeParams: true });

type parentParams = { portfolioId: number };

/**
 * List all balances
 */
router.get("/index", (req, res) => {
  const { portfolioId } = req.params as typeof req.params & parentParams;

  Portfolio.findByPk(portfolioId, {
    include: [
      { model: Balance, as: "balances" },
      { model: Currency, as: "baseRates" },
    ],
  })
    .then((portfolio) => {
      if (!portfolio) throw Error("Portfolio not found!");
      const balances: BalanceEntry[] = portfolio.balances.map((item) => {
        return {
          id: item.id,
          quantity: item.quantity,
          currency: item.currency,
          baseRate: 1 / (portfolio.baseRates.find((rate) => rate.currency == item.currency)?.rate || 1),
        } as BalanceEntry;
      });
      res.status(200).json({ balances });
    })
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Delete a balance entry
 */
router.delete("/id/:balanceId(\\d+)/DeleteBalance", (req, res): void => {
  const { balanceId } = req.params as typeof req.params & parentParams;

  Balance.findByPk(balanceId)
    .then(async (balance) => {
      if (balance) return balance.destroy();
      else throw Error("balance entry not found");
    })
    .then(() => res.status(200).end())
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Get a single balance
 */
router.get("/id/:balanceId(\\d+)", (req, res): void => {
  const { portfolioId, balanceId } = req.params as typeof req.params & parentParams;

  Portfolio.findByPk(portfolioId, {
    include: [{ association: "baseRates" }, { association: "balances", where: { id: balanceId }, required: true }],
    // logging: console.log,
  })
    .then((portfolio) => {
      if (portfolio) {
        const balance = portfolio.balances[0];
        const baseRate = portfolio.baseRates.find((item) => item.currency == balance.currency)?.rate;
        const availCurrencies = portfolio.baseRates.map((item) => item.currency);
        const result: BalanceEntry = {
          id: balance.id,
          quantity: balance.quantity,
          currency: balance.currency,
          baseRate,
          availCurrencies,
        };
        return result;
      } else {
        throw Error("portfolio doesn't exist");
      }
    })
    .then((balance) => {
      res.status(200).json({ balance });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({ error });
    });
});

/**
 * Save a balance
 */
router.post("/id/:balanceId(\\d+)/SaveBalance", (req, res): void => {
  const { _portfolioId, balanceId } = req.params as typeof req.params & parentParams;
  const data = req.body as BalanceEntry;

  Balance.findByPk(balanceId)
    .then(async (balance) => {
      // console.log(JSON.stringify(position));
      if (balance)
        return balance.update({
          quantity: data.quantity,
        });
      else throw Error("balance not found");
    })
    .then((balance) => res.status(200).json({ balance }))
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".SaveBalance", undefined, JSON.stringify(error));
      res.status(500).json({ error });
    });
});

export default router;
