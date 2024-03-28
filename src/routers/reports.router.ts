import { default as express } from "express";
import { Op } from "sequelize";
import { LogLevel, default as logger } from "../logger";
import { Portfolio, Statement } from "../models";
import { prepareReport } from "./statements.utils";

const MODULE = "ReportsRouter";

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unused-vars
const sequelize_logging = (...args: any[]): void => logger.trace(MODULE + ".squelize", ...args);

const router = express.Router({ mergeParams: true });

type parentParams = { portfolioId: number };

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

/**
 * Get YTD monthly reports
 */
router.get("/summary/ytd", (req, res): void => {
  const { portfolioId } = req.params as typeof req.params & parentParams;

  Statement.findAll({
    where: {
      portfolio_id: portfolioId,
      date: {
        [Op.gte]: new Date(new Date().getFullYear(), 0, 1),
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

/**
 * Get last 12 months monthly reports
 */
router.get("/summary/12m", (req, res): void => {
  const { portfolioId } = req.params as typeof req.params & parentParams;
  const today = new Date();

  Statement.findAll({
    where: {
      portfolio_id: portfolioId,
      date: {
        [Op.gte]: new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()),
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
