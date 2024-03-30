import { default as express } from "express";
import { Op } from "sequelize";
import { LogLevel, default as logger } from "../logger";
import { Contract, Portfolio, Statement } from "../models";
import { prepareReport } from "./statements.utils";

const MODULE = "ReportsRouter";

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unused-vars
const sequelize_logging = (...args: any[]): void => logger.trace(MODULE + ".squelize", ...args);

const router = express.Router({ mergeParams: true });

type parentParams = { portfolioId: number };

/* +++++ Routes +++++ */

/**
 * Get a yearly report
 */
router.get("/year/:year(\\d+)", (req, res): void => {
  const { portfolioId, year } = req.params as typeof req.params & parentParams;

  Portfolio.findByPk(portfolioId, {
    include: [
      {
        model: Statement,
        as: "statements",
        required: false,
        include: [{ model: Contract, as: "stock", required: false }],
        where: {
          date: {
            [Op.gte]: new Date(parseInt(year), 0, 1),
            [Op.lt]: new Date(parseInt(year) + 1, 0, 1),
          },
        },
      },
    ],
  })
    .then((portfolio) => prepareReport(portfolio!))
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
 * Get all monthly reports
 */
router.get("/summary/all", (req, res): void => {
  const { portfolioId } = req.params as typeof req.params & parentParams;

  Portfolio.findByPk(portfolioId, {
    include: [
      {
        model: Statement,
        as: "statements",
        required: false,
        include: [{ model: Contract, as: "stock", required: false }],
        where: {
          date: {
            [Op.gte]: new Date(2021, 0, 1),
          },
        },
      },
    ],
  })
    .then((portfolio) => prepareReport(portfolio!))
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

  Portfolio.findByPk(portfolioId, {
    include: [
      {
        model: Statement,
        as: "statements",
        required: false,
        include: [{ model: Contract, as: "stock", required: false }],
        where: {
          date: {
            [Op.gte]: new Date(new Date().getFullYear(), 0, 1),
          },
        },
      },
    ],
  })
    .then((portfolio) => prepareReport(portfolio!))
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

  Portfolio.findByPk(portfolioId, {
    include: [
      {
        model: Statement,
        as: "statements",
        required: false,
        include: [{ model: Contract, as: "stock", required: false }],
        where: {
          date: {
            [Op.gte]: new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()),
          },
        },
      },
    ],
  })
    .then((portfolio) => prepareReport(portfolio!))
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
