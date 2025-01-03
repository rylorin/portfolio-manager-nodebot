import { default as express } from "express";
import logger, { LogLevel } from "../logger";
import { Balance, Contract, Currency, Portfolio, Position, Statement, Trade } from "../models";
import { ContractType } from "../models/types";
import { BalanceEntry } from "./balances.types";
import { ContractEntry } from "./contracts.types";
import { preparePositions } from "./positions.router";
import { OptionPositionEntry, PositionEntry } from "./positions.types";
import { StatementEntry } from "./statements.types";
import { statementModelToStatementEntry } from "./statements.utils";
import { TradeEntry } from "./trades.types";
import { tradeModelToTradeEntry } from "./trades.utils";

const MODULE = "ContractsRouter";

const router = express.Router({ mergeParams: true });

interface parentParams {
  portfolioId: number;
}

const getAllPositionsRelatedToContract = async (
  portfolioId: number,
  contractId: number,
): Promise<(PositionEntry | OptionPositionEntry)[]> => {
  return Portfolio.findByPk(portfolioId, {
    include: [
      { model: Position, as: "positions", include: [{ model: Contract, as: "contract" }] },
      { model: Currency, as: "baseRates" },
    ],
  }).then(async (portfolio) => {
    if (!portfolio) throw Error("portfolio not found: " + portfolioId);
    else if (portfolio.positions)
      return preparePositions(portfolio).then((positions) =>
        positions.filter((item) => {
          switch (item.contract.secType) {
            case ContractType.Stock:
            case ContractType.Future:
            case ContractType.Bond:
              return item.contract.id == contractId;
            case ContractType.Option:
            case ContractType.FutureOption:
              return item.contract.id == contractId || (item as OptionPositionEntry).underlying.id == contractId;
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
  // console.log("contract", portfolioId, contractId);
  Contract.findByPk(contractId)
    .then((contract) => {
      if (!contract) throw Error("Contract not found: " + contractId);
      // Create ContractEntry from Contract model
      return {
        id: contract.id,
        conId: contract.conId,
        symbol: contract.symbol,
        secType: contract.secType,
        exchange: contract.exchange,
        currency: contract.currency,
        name: contract.name,
        price: contract.price,
        bid: contract.bid,
        ask: contract.ask,
        previousClosePrice: contract.previousClosePrice,
        fiftyTwoWeekLow: contract.fiftyTwoWeekLow,
        fiftyTwoWeekHigh: contract.fiftyTwoWeekHigh,
      } as ContractEntry;
    })
    .then(async (contract) => {
      // Add positions
      return getAllPositionsRelatedToContract(portfolioId, parseInt(contractId)).then((positions) => {
        contract.positions = positions;
        return contract;
      });
    })
    .then(async (contract) => {
      // Add trades
      return Trade.findAll({
        where: { portfolio_id: portfolioId, symbol_id: contractId },
        include: [{ model: Contract, as: "underlying" }],
      })
        .then(async (trades) => {
          logger.log(LogLevel.Trace, MODULE + ".GetContract", undefined, "trades", trades);
          return trades.reduce(
            async (p: Promise<TradeEntry[]>, item: Trade): Promise<TradeEntry[]> => {
              logger.log(LogLevel.Trace, MODULE + ".GetContract", undefined, "item", item);
              return p.then(async (entries) => {
                return tradeModelToTradeEntry(item).then((entry) => {
                  entries.push(entry);
                  return entries;
                });
              });
            },
            Promise.resolve([] as TradeEntry[]),
          );
        })
        .then((trade_entries) => {
          contract.trades = trade_entries;
          return contract;
        });
    })
    .then(async (contract) => {
      // Add statements
      return Statement.findAll({
        where: { portfolio_id: portfolioId, stock_id: contractId },
        include: [{ model: Contract, as: "stock" }],
      })
        .then(async (statements) => {
          return statements.reduce(
            async (p, statement) => {
              return p.then(async (entries) => {
                return statementModelToStatementEntry(statement).then((entry) => {
                  entries.push(entry);
                  return entries;
                });
              });
            },
            Promise.resolve([] as StatementEntry[]),
          );
        })
        .then((statement_entries) => {
          contract.statements = statement_entries;
          return contract;
        });
    })
    // .then((value) => {
    //   // Display value for debugging
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
 * List all contracts
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
