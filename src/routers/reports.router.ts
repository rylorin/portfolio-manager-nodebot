import { default as express } from "express";
import { Op } from "sequelize";
import { Balance, Currency, Portfolio } from "../models";
import { prepareReport } from "./statements.utils";

// const MODULE = "ReportsRouter";

const router = express.Router({ mergeParams: true });

type parentParams = { portfolioId: number };

/**
 * List all available reports
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
      const reports: number[] = [2022, 2023, 2024];
      res.status(200).json({ reports });
    })
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Get a yearly report
 */
router.get("/year/:year(\\d+)", (req, res): void => {
  const { portfolioId, year } = req.params as typeof req.params & parentParams;

  Portfolio.findByPk(portfolioId, {
    include: [
      { association: "baseRates" },
      {
        association: "statements",
        where: {
          date: {
            [Op.gte]: new Date(parseInt(year), 0, 1),
            [Op.lt]: new Date(parseInt(year) + 1, 0, 1),
          },
        },
        required: false,
      },
    ],
    // logging: console.log,
  })
    .then((portfolio) => {
      if (portfolio) {
        return prepareReport(portfolio, parseInt(year), 0);
      } else {
        throw Error("portfolio doesn't exist");
      }
    })
    .then((report) => {
      res.status(200).json({ report });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({ error });
    });
});

export default router;
