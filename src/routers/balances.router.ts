import { default as express } from "express";
import { Balance, Currency, Portfolio } from "../models";
import { BalanceEntry } from "./balances.types";

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

export default router;
