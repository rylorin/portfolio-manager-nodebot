import { OptionType, SecType } from "@stoqey/ib";
import { default as express } from "express";
import { ContracType, Contract, Currency, Option, Portfolio, Position, Trade } from "../models";
import { OptionPositionEntry, PositionEntry } from "../routers/types";

const router = express.Router({ mergeParams: true });

type parentParams = { portfolioId: number };

const getPrice = (item: Contract): number => {
  return item.price || (item.ask + item.bid) / 2 || item.previousClosePrice;
};

const getMultiplier = (item: Position): Promise<number> => {
  switch (item.contract.secType) {
    case ContracType.Option:
      return Option.findByPk(item.contract.id).then((option) => option?.multiplier || 100);
      break;
  }
  // default value
  return Promise.resolve(1);
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
        // console.log("portfolio", JSON.stringify(portfolio));
        return portfolio.positions.reduce((p, item) => {
          return p.then((positions) => {
            switch (item.contract.secType) {
              case SecType.STK: {
                // console.log("option:", JSON.stringify(option));
                const price = getPrice(item.contract);
                const value = price * item.quantity;
                const baseRate =
                  1 / (portfolio.baseRates.find((currency) => currency.currency == item.contract.currency)?.rate || 1);
                const result: PositionEntry = {
                  id: item.id,
                  quantity: item.quantity,
                  contract: {
                    id: item.contract.id,
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
                  const apy = engaged && duration ? (-(value - item.cost) / engaged / duration) * 365 : undefined;
                  const baseRate =
                    1 /
                    (portfolio.baseRates.find((currency) => currency.currency == item.contract.currency)?.rate || 1);
                  const result: OptionPositionEntry = {
                    id: item.id,
                    quantity: item.quantity,
                    contract: {
                      id: item.contract.id,
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
                    engaged: engaged < 0 ? engaged : 0,
                    risk: engaged < 0 ? engaged * Math.abs(option.delta) : 0,
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
        }, Promise.resolve([] as (PositionEntry | OptionPositionEntry)[]));
      } else throw Error("Portfolio not found");
    })
    .then((positions: PositionEntry[]) => res.status(200).json({ positions }))
    .catch((error) => res.status(500).json({ error }));
});

/**
 * List all positions
 */
router.get("/Xindex", async (req, res) => {
  const { portfolioId } = req.params as typeof req.params & parentParams;

  const portfolio = await Portfolio.findByPk(portfolioId, {
    include: [{ model: Position } /*, { model: Currency } */],
  });
  if (!portfolio) throw Error("Portfolio not found!");
  // console.log(portfolio);

  const baseRates = await Currency.findAll({ where: { base: portfolio.baseCurrency } }).then((records) =>
    records.reduce((p, item) => {
      p[item.currency] = 1 / item.rate;
      return p;
    }, {} as Record<string, number>),
  );
  // console.log(baseRates);

  const dbPositions = await Position.findAll({
    where: {
      portfolio_id: portfolioId,
    },
    include: [{ model: Contract }, { model: Trade }],
  });
  // console.log(dbPositions);

  const promPositions = dbPositions.map(async (item) => {
    const multiplier = await getMultiplier(item);
    const price = getPrice(item.contract);
    const value = price * item.quantity * multiplier;
    return {
      id: item.id,
      quantity: item.quantity,
      contract: {
        id: item.contract.id,
        symbol: item.contract.symbol,
        name: item.contract.name,
        multiplier,
        currency: item.contract.currency,
      },
      trade_id: item.trade_unit_id,
      price,
      value,
      pru: item.cost / item.quantity / multiplier,
      cost: item.cost,
      pnl: value - item.cost,
      baseRate: baseRates[item.contract.currency],
    } as PositionEntry;
  });
  Promise.all(promPositions)
    .then((positions: PositionEntry[]) => res.status(200).json({ positions }))
    .catch((error) => res.status(500).json({ error }));
});

/**
 * List options positions
 */
router.get("/options", (req, res): void => {
  const { portfolioId } = req.params as typeof req.params & parentParams;

  Portfolio.findByPk(portfolioId, {
    include: [
      {
        model: Position,
        as: "positions",
        include: [{ model: Contract, as: "contract", where: { secType: ContracType.Option } }],
      },
      { model: Currency, as: "baseRates" },
    ],
    // logging: console.log,
  })
    .then((portfolio) => {
      if (portfolio) {
        // console.log("portfolio", JSON.stringify(portfolio));
        return portfolio.positions.reduce((p, item) => {
          return p.then((positions) => {
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
              const apy = engaged && duration ? (-(value - item.cost) / engaged / duration) * 365 : undefined;
              const baseRate =
                1 / (portfolio.baseRates.find((currency) => currency.currency == item.contract.currency)?.rate || 1);
              const result: OptionPositionEntry = {
                id: item.id,
                quantity: item.quantity,
                contract: {
                  id: item.contract.id,
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
                engaged: engaged < 0 ? engaged : 0,
                risk: engaged < 0 ? engaged * Math.abs(option.delta) : 0,
                apy,
              };
              // console.log(item.contract.currency, result);
              positions.push(result);
              return positions;
            });
          });
        }, Promise.resolve([] as OptionPositionEntry[]));
      } else throw Error("Portfolio not found");
    })
    .then((positions: OptionPositionEntry[]) => res.status(200).json({ positions }))
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Delete a positions
 */
router.get("/id/:positionId(\\d+)/DeletePosition", (req, res): void => {
  const { portfolioId, positionId } = req.params as typeof req.params & parentParams;
  console.log("DeletePosition", portfolioId, positionId);
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
  const { _portfolioId, positionId } = req.params as typeof req.params & parentParams;
  Position.findByPk(positionId)
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
