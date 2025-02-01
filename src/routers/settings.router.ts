import express from "express";
import { SettingEntry } from ".";
import { default as logger, LogLevel } from "../logger";
import { Setting } from "../models";

const MODULE = "SettingsRouter";

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
const _sequelize_logging = (...args: any[]): void => logger.trace(MODULE + ".squelize", ...args);

const router = express.Router({ mergeParams: true });

interface parentParams {
  portfolioId: number;
}

/**
 * Create a setting
 */
router.put("/", (req, res): void => {
  const { portfolioId } = req.params as typeof req.params & parentParams;
  const data = req.body as SettingEntry;

  const setting = {
    portfolio_id: portfolioId,
    stock_id: data.stock_id,
    lookupDays: data.lookupDays,

    minPremium: data.minPremium,

    cspStrategy: data.cspStrategy,
    navRatio: data.navRatio,
    cspDelta: data.cspDelta ? -Math.abs(data.cspDelta) : -0.15,
    rollPutStrategy: data.rollPutStrategy,

    ccStrategy: data.ccStrategy,
    ccDelta: data.ccDelta,
    rollCallStrategy: data.rollCallStrategy,
  };
  Setting.create(setting)
    .then(async (setting) => setting.getUnderlying().then((_) => setting))
    .then((setting) => res.status(200).json({ setting }))
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".put", undefined, error.msg);
      res.status(500).json({ error });
    });
});

/**
 * Get a setting
 */
router.get("/:itemId(\\d+)/", (req, res): void => {
  const { portfolioId, itemId } = req.params as typeof req.params & parentParams;

  Setting.findOne({ where: { id: itemId, portfolio_id: portfolioId }, include: { association: "underlying" } })
    .then((setting) => res.status(200).json({ setting }))
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".get", undefined, JSON.stringify(error));
      res.status(500).json({ error });
    });
});

/**
 * Save a setting
 */
router.post("/:itemId(\\d+)/", (req, res): void => {
  const { _portfolioId, itemId } = req.params as typeof req.params & parentParams;
  const data = req.body as SettingEntry;

  Setting.findByPk(itemId)
    .then(async (setting: Setting) => {
      if (setting) {
        setting.stock_id = data.stock_id;
        setting.lookupDays = data.lookupDays;
        setting.minPremium = data.minPremium;

        setting.cspStrategy = data.cspStrategy;
        setting.navRatio = data.navRatio;
        setting.cspDelta = -Math.abs(data.cspDelta);
        setting.rollPutStrategy = data.rollPutStrategy;

        setting.ccStrategy = data.ccStrategy;
        setting.ccDelta = data.ccDelta;
        setting.rollCallStrategy = data.rollCallStrategy;
        return setting.save();
      } else throw Error(`Setting #${itemId} not found!`);
    })
    .then((setting) => res.status(200).json({ setting }))
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".post", undefined, error.msg);
      res.status(500).json({ error });
    });
});

/**
 * Delete a setting
 */
router.delete("/:itemId(\\d+)/", (req, res): void => {
  const { portfolioId, itemId } = req.params as typeof req.params & parentParams;

  Setting.destroy({ where: { id: itemId, portfolio_id: portfolioId } })
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
