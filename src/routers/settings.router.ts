import express from "express";
import { default as logger, LogLevel } from "../logger";
import { Setting } from "../models";

const MODULE = "SettingsRouter";

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
const _sequelize_logging = (...args: any[]): void => logger.trace(MODULE + ".squelize", ...args);

const router = express.Router({ mergeParams: true });

type parentParams = { portfolioId: number };

/**
 * Delete a statement
 */
router.delete("/:itemId(\\d+)/", (req, res): void => {
  const { _portfolioId, itemId } = req.params as typeof req.params & parentParams;

  Setting.destroy({ where: { id: itemId } })
    .then((_count) => {
      // console.log("statement deleted");
      res.status(200).end();
    })
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".deleteS", undefined, JSON.stringify(error));
      res.status(500).json({ error });
    });
});

/**
 * Catch all url
 */
router.get("*", (req, _res, next): void => {
  console.log(`unknown ${MODULE} path: ${req.path}`);
  next();
});

export default router;
