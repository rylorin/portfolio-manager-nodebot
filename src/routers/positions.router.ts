import { OptionType, SecType } from "@stoqey/ib";
import { default as express } from "express";
import logger, { LogLevel } from "../logger";
import { Contract, Currency, Option, OptionStatement, Portfolio, Position, Statement } from "../models";
import { OptionPositionEntry, PositionEntry } from "./positions.types";

const MODULE = "PositionsRouter";

export const router = express.Router({ mergeParams: true });

type parentParams = { portfolioId: number };

const getPrice = (item: Contract): number => {
  return item.price || (item.ask + item.bid) / 2 || item.previousClosePrice;
};

// const getMultiplier = (item: Position): Promise<number> => {
//   switch (item.contract.secType) {
//     case ContracType.Option:
//       return Option.findByPk(item.contract.id).then((option) => option?.multiplier || 100);
//       break;
//   }
//   // default value
//   return Promise.resolve(1);
// };

const preparePositions = (portfolio: Portfolio): Promise<(PositionEntry | OptionPositionEntry)[]> => {
  return portfolio.positions.reduce(
    (p, item: Position) => {
      return p.then((positions) => {
        switch (item.contract?.secType) {
          case SecType.STK: {
            const price = getPrice(item.contract);
            const value = price * item.quantity;
            const baseRate =
              1 / (portfolio.baseRates.find((currency) => currency.currency == item.contract.currency)?.rate || 1);
            const result: PositionEntry = {
              id: item.id,
              openDate: item.createdAt.getTime(),
              quantity: item.quantity,
              contract: {
                id: item.contract.id,
                secType: item.contract.secType,
                symbol: item.contract.symbol,
                name: item.contract.name,
                multiplier: 1,
                currency: item.contract.currency,
                price: getPrice(item.contract),
              },
              trade_id: item.trade_unit_id,
              price,
              value,
              pru: item.cost / item.quantity,
              cost: item.cost,
              pnl: value - item.cost,
              baseRate,
            };
            // console.log(item.contract.currency, result);
            positions.push(result);
            return positions;
          }
          case SecType.OPT:
            return Option.findByPk(item.contract.id, {
              include: [
                { model: Contract, as: "contract" },
                { model: Contract, as: "stock" },
              ],
            }).then((option) => {
              if (!option) throw Error("Option contract not found");
              // console.log("option:", JSON.stringify(option));
              const price = getPrice(item.contract);
              const value = price * item.quantity * option.multiplier;
              const engaged =
                option.strike *
                option.multiplier *
                (option.callOrPut == OptionType.Put ? item.quantity : -item.quantity);
              const duration = (Date.now() - item.createdAt.getTime()) / 1000 / 3600 / 24;
              const apy = engaged && duration ? ((item.cost - value) / engaged / duration) * 365 : undefined;
              const baseRate =
                1 / (portfolio.baseRates.find((currency) => currency.currency == item.contract.currency)?.rate || 1);
              const result: OptionPositionEntry = {
                id: item.id,
                openDate: item.createdAt.getTime(),
                quantity: item.quantity,
                contract: {
                  id: item.contract.id,
                  secType: item.contract.secType,
                  symbol: item.contract.symbol,
                  name: item.contract.name,
                  multiplier: option.multiplier,
                  currency: item.contract.currency,
                  price: getPrice(item.contract),
                },
                trade_id: item.trade_unit_id,
                price,
                value,
                pru: item.cost / item.quantity / option.multiplier,
                cost: item.cost,
                pnl: value - item.cost,
                baseRate,
                option: {
                  id: item.contract.id,
                  symbol: option.stock.symbol,
                  expiration: option.lastTradeDate.toISOString().substring(0, 10),
                  strike: option.strike,
                  type: option.callOrPut,
                  delta: option.delta,
                },
                stock: {
                  id: option.stock.id,
                  symbol: option.stock.symbol,
                  price: getPrice(option.stock),
                },
                engaged,
                risk: engaged * Math.abs(option.delta),
                apy,
              };
              // console.log(item.contract.currency, result);
              positions.push(result);
              return positions;
            });
          default:
            throw Error("unimplemented sectype: " + item.contract.secType);
        }
      });
    },
    Promise.resolve([] as (PositionEntry | OptionPositionEntry)[]),
  );
};

/**
 * List all positions
 */
router.get("/index", (req, res): void => {
  const { portfolioId } = req.params as typeof req.params & parentParams;

  Portfolio.findByPk(portfolioId, {
    include: [
      {
        model: Position,
        as: "positions",
        include: [{ model: Contract, as: "contract" }],
      },
      { model: Currency, as: "baseRates" },
    ],
    // logging: console.log,
  })
    .then((portfolio) => {
      if (portfolio) {
        return preparePositions(portfolio);
      } else throw Error("Portfolio not found");
    })
    .then((positions: PositionEntry[]) => res.status(200).json({ positions }))
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Save a positions
 */
router.post("/id/:positionId(\\d+)/SavePosition", (req, res): void => {
  const { _portfolioId, positionId } = req.params as typeof req.params & parentParams;
  const data = req.body as PositionEntry;
  // console.log("SavePosition", portfolioId, positionId, data, req.body);

  Position.findByPk(positionId)
    .then((position) => {
      // console.log(JSON.stringify(position));
      if (position)
        return position.update({
          contract_id: data.contract.id,
          cost: data.cost,
          quantity: data.quantity,
          trade_unit_id: data.trade_id,
        });
      else throw Error("position not found");
    })
    .then((position) => res.status(200).json({ position }))
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".SavePosition", undefined, error);
      res.status(500).json({ error });
    });
});

/**
 * Delete a positions
 */
router.get("/id/:positionId(\\d+)/DeletePosition", (req, res): void => {
  const { positionId } = req.params as typeof req.params & parentParams;

  Position.findByPk(positionId)
    .then((position) => {
      if (position) return position.destroy();
      else throw Error("position not found");
    })
    .then(() => res.status(200).end())
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Get a single position
 */
router.get("/id/:positionId(\\d+)", (req, res): void => {
  const { portfolioId, positionId } = req.params as typeof req.params & parentParams;
  Portfolio.findByPk(portfolioId, {
    include: [
      {
        model: Position,
        as: "positions",
        include: [{ model: Contract, as: "contract" }],
        where: { id: positionId },
      },
      { model: Currency, as: "baseRates" },
    ],
    // logging: console.log,
  })
    .then((portfolio) => {
      if (portfolio) {
        return preparePositions(portfolio);
      } else throw Error("Portfolio not found");
    })
    .then((positions: PositionEntry[]) => res.status(200).json({ position: positions[0] }))
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Guess trade of a position
 */
router.get("/:positionId(\\d+)/GuessTrade", (req, res): void => {
  const { portfolioId, positionId } = req.params as typeof req.params & parentParams;
  Portfolio.findByPk(portfolioId, {
    include: [
      {
        model: Position,
        as: "positions",
        include: [{ model: Contract, as: "contract" }],
        where: { id: positionId },
        required: true,
      },
      { model: Currency, as: "baseRates" },
    ],
    // logging: console.log,
  })
    .then((portfolio) => {
      if (portfolio) {
        const position = portfolio.positions[0];
        if (position.contract.secType == SecType.STK) {
          return Statement.findOne({
            where: {
              portfolio_id: portfolioId,
              stock_id: position.contract.id,
            },
            order: [["date", "DESC"]],
          }).then((ref) => position.update({ trade_unit_id: ref?.trade_unit_id }));
        } else if (position.contract.secType == SecType.OPT) {
          return OptionStatement.findOne({
            where: {
              contract_id: position.contract.id,
            },
            order: [["statement", "date", "DESC"]],
            // logging: console.log,
            include: [{ model: Statement, as: "statement", where: { portfolio_id: portfolioId }, required: true }],
          })
            .then((statement) => {
              if (statement) return Statement.findByPk(statement.id);
              else return null;
            })
            .then((ref) => position.update({ trade_unit_id: ref?.trade_unit_id }));
        } else throw Error("invalid position SecType" + position.contract.secType);
      } else throw Error("Portfolio or position not found");
    })
    .then((position) => res.status(200).json({ position }))
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Add a position to a given existing trade
 */
router.get("/:positionId(\\d+)/AddToTrade/:tradeId(\\d+)", (req, res): void => {
  const { portfolioId, positionId, tradeId } = req.params as typeof req.params & parentParams;
  logger.log(LogLevel.Debug, MODULE + ".AddToTrade", undefined, req.params);
  Portfolio.findByPk(portfolioId, {
    include: [
      {
        model: Position,
        as: "positions",
        include: [{ model: Contract, as: "contract" }],
        where: { id: positionId },
        required: true,
      },
      { model: Currency, as: "baseRates" },
    ],
    // logging: console.log,
  })
    .then((portfolio) => {
      if (portfolio) {
        const position = portfolio.positions[0];
        if (position) {
          return position.update({ trade_unit_id: parseInt(tradeId) });
        } else throw Error("position not found: " + positionId);
      } else throw Error("Portfolio or position not found");
    })
    .then((position) => res.status(200).json({ position }))
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Catch all url
 */
router.get("*", (req, _res, next): void => {
  console.log("unknown position path:", req.path);
  next();
});

export default router;
