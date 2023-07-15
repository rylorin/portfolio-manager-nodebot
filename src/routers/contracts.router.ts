import { SecType } from "@stoqey/ib";
import { default as express } from "express";
import logger, { LogLevel } from "../logger";
import { Balance, Contract, Currency, Portfolio, Position, Trade } from "../models";
import { BalanceEntry } from "./balances.types";
import { preparePositions } from "./positions.router";
import { OptionPositionEntry, PositionEntry } from "./positions.types";
import { tradeModelToTradeEntry } from "./trades.router";
import { TradeEntry } from "./trades.types";

const MODULE = "ContractsRouter";

const router = express.Router({ mergeParams: true });

type parentParams = { portfolioId: number };

const getAllPositionsRelatedToContract = (
  portfolioId: number,
  contractId: number,
): Promise<(PositionEntry | OptionPositionEntry)[]> => {
  return Portfolio.findByPk(portfolioId, {
    include: [
      { model: Position, as: "positions", include: [{ model: Contract, as: "contract" }] },
      { model: Currency, as: "baseRates" },
    ],
  }).then((portfolio) => {
    if (!portfolio) throw Error("portfolio not found: " + portfolioId);
    else if (portfolio.positions)
      return preparePositions(portfolio).then((positions) =>
        positions.filter((item) => {
          switch (item.contract.secType) {
            case SecType.STK:
              return item.contract.id == contractId;
            case SecType.OPT:
              return item.contract.id == contractId || (item as OptionPositionEntry).stock.id == contractId;
            default:
              throw Error("getAllPositionsRelatedToContract not implemented for type: " + item.contract.secType);
          }
        }),
      );
    else return [];
  });
};

/**
 * Get a contract
 */
router.get("/id/:contractId(\\d+)", (req, res): void => {
  const { portfolioId, contractId } = req.params as typeof req.params & parentParams;
  console.log("contract", portfolioId, contractId);
  Contract.findByPk(contractId)
    .then((contract) => {
      if (!contract) throw Error("Contract not found: " + contractId);
      return getAllPositionsRelatedToContract(portfolioId, parseInt(contractId)).then((positions) => {
        return Trade.findAll({
          where: { portfolio_id: portfolioId, symbol_id: contractId },
          include: [{ model: Contract, as: "stock" }],
        }).then((trades) => {
          logger.log(LogLevel.Trace, MODULE + ".GetContract", undefined, "trades", trades);
          return trades
            .reduce(
              (p: Promise<TradeEntry[]>, item: Trade): Promise<TradeEntry[]> => {
                logger.log(LogLevel.Trace, MODULE + ".GetContract", undefined, "item", item);
                return p.then((entries) => {
                  return tradeModelToTradeEntry(item).then((entry) => {
                    entries.push(entry);
                    return entries;
                  });
                });
              },
              Promise.resolve([] as TradeEntry[]),
            )
            .then((trade_entries) => {
              return {
                ...contract.dataValues,
                positions,
                trades: trade_entries,
              };
            });
        });
      });
    })
    // .then((value) => {
    //   console.log(value);
    //   return value;
    // })
    .then((contract) => res.status(200).json({ contract }))
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".GetContract", undefined, error.msg);
      res.status(500).json({ error });
    });
});

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
