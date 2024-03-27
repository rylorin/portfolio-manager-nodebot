import { default as express } from "express";
import { Op } from "sequelize";
import { LogLevel, default as logger } from "../logger";
import { Balance, Currency, Portfolio, Statement } from "../models";
import { prepareReport } from "./statements.utils";

const MODULE = "ReportsRouter";

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unused-vars
const sequelize_logging = (...args: any[]): void => logger.trace(MODULE + ".squelize", ...args);

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
        return prepareReport(portfolio.statements);
      } else {
        throw Error("portfolio doesn't exist");
      }
    })
    .then((reports) => {
      res.status(200).json({ reports });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({ error });
    });
});

/**
 * Get all monthly reports
 */
router.get("/summary/all", (req, res): void => {
  const { portfolioId } = req.params as typeof req.params & parentParams;

  Statement.findAll({
    where: {
      portfolio_id: portfolioId,
      date: {
        [Op.gte]: new Date(2021, 0, 1),
      },
    },
  })
    .then((statements) => prepareReport(statements))
    .then((reports) => {
      res.status(200).json({ reports });
    })
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".All", undefined, JSON.stringify(error));
      res.status(500).json({ error });
    });
});

export default router;
