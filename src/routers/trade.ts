import express from "express";
import { Op } from "sequelize";
import {
  Contract,
  EquityStatement,
  OptionStatement,
  Portfolio,
  Statement,
  StatementTypes,
  Trade,
  TradeStrategy,
} from "../models";
import { StatementEntry, TradeEntry, TradeMonthlySynthesys, TradeSynthesys } from "./types";

const router = express.Router({ mergeParams: true });

type parentParams = { portfolioId: number };

const formatDate = (when: Date): string => {
  const datestr = when.toISOString().substring(0, 7);
  return datestr;
};

function makeSynthesys(trades: Trade[]): TradeSynthesys {
  const theSynthesys: TradeSynthesys = { open: [], byMonth: {} as TradeMonthlySynthesys };
  trades.forEach((item) => {
    if (item.closingDate) {
      // console.log(JSON.stringify(item));
      // console.log(item.id);
      const idx = formatDate(item.openingDate);
      if (theSynthesys.byMonth[idx] === undefined) {
        theSynthesys.byMonth[idx] = { count: 0, success: 0, duration: 0, min: undefined, max: undefined, total: 0 };
      }
      theSynthesys.byMonth[idx].count += 1;
      theSynthesys.byMonth[idx].duration +=
        (item.closingDate.getTime() - item.openingDate.getTime()) / 1000 / 3600 / 24;
      if (item.PnL) {
        // TODO: multiply by baseRate
        if (item.PnL > 0) theSynthesys.byMonth[idx].success += 1;
        theSynthesys.byMonth[idx].total += item.PnL;
        theSynthesys.byMonth[idx].min = theSynthesys.byMonth[idx].min
          ? Math.min(theSynthesys.byMonth[idx].min, item.PnL)
          : item.PnL;
        theSynthesys.byMonth[idx].max = theSynthesys.byMonth[idx].max
          ? Math.max(theSynthesys.byMonth[idx].max, item.PnL)
          : item.PnL;
      }
    } else {
      const duration = (Date.now() - item.openingDate.getTime()) / 1000 / 3600 / 24;
      const apy = item.risk && item.PnL ? (item.PnL / item.risk / duration) * 365 : undefined;
      const trade: TradeEntry = {
        id: item.id,
        symbol_id: item.stock.id,
        symbol: item.stock.symbol,
        currency: item.currency,
        openingDate: item.openingDate.getTime(),
        closingDate: undefined,
        status: item.status,
        duration: item.duration,
        strategy: item.strategy,
        strategyLabel: TradeStrategy[item.strategy],
        risk: item.risk,
        pnl: item.PnL,
        apy,
        comment: item.comment,
        statements: undefined,
      };
      theSynthesys.open.push(trade);
    }
  });
  // console.log(JSON.stringify(theSynthesys));
  return theSynthesys;
}

/**
 * Get all trades
 */
router.get("/summary/all", (req, res): void => {
  const { portfolioId } = req.params as typeof req.params & parentParams;

  Trade.findAll({
    where: {
      portfolio_id: portfolioId,
      openingDate: {
        [Op.gte]: new Date(2021, 0, 1),
      },
    },
    include: [{ model: Contract, as: "stock" }],
    // limit: 500,
  })
    .then((trades: Trade[]) => res.status(200).json({ tradessynthesys: makeSynthesys(trades) }))
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Get last 12 months trades
 */
router.get("/summary/12m", (req, res): void => {
  const { portfolioId } = req.params as typeof req.params & parentParams;
  const today = new Date();

  Trade.findAll({
    where: {
      portfolio_id: portfolioId,
      openingDate: {
        [Op.gte]: new Date(2021, 0, 1),
      },
      closingDate: {
        [Op.or]: {
          [Op.gte]: new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()),
          [Op.is]: undefined,
        },
      },
    },
    include: [{ model: Contract, as: "stock" }],
    // limit: 500,
  })
    .then((trades: Trade[]) => res.status(200).json({ tradessynthesys: makeSynthesys(trades) }))
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Get YTD trades
 */
router.get("/summary/ytd", (req, res): void => {
  const { portfolioId } = req.params as typeof req.params & parentParams;

  Trade.findAll({
    where: {
      portfolio_id: portfolioId,
      openingDate: {
        [Op.gte]: new Date(2021, 0, 1),
      },
      closingDate: {
        [Op.or]: {
          [Op.gte]: new Date(new Date().getFullYear(), 0, 1),
          [Op.is]: undefined,
        },
      },
    },
    include: [{ model: Contract, as: "stock" }],
    // limit: 500,
  })
    .then((trades: Trade[]) => res.status(200).json({ tradessynthesys: makeSynthesys(trades) }))
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Get a trade
 */
router.get("/id/:tradeId(\\d+)", (req, res): void => {
  const { _portfolioId, tradeId } = req.params as typeof req.params & parentParams;
  // console.log("get trade", portfolioId, tradeId);
  Trade.findByPk(tradeId, {
    include: [
      { model: Contract, as: "stock" },
      { model: Portfolio, as: "portfolio" },
      { model: Statement, as: "statements" },
    ],
    // logging: console.log,
  })
    .then((trade) => {
      if (trade) {
        return trade;
      } else {
        throw Error("trade doesn't exist");
      }
    })
    .then((thisTrade) => {
      const apy =
        thisTrade.risk && thisTrade.PnL ? (thisTrade.PnL / thisTrade.risk / thisTrade.duration) * 365 : undefined;
      const trade: TradeEntry = {
        id: thisTrade.id,
        symbol_id: thisTrade.stock.id,
        symbol: thisTrade.stock.symbol,
        currency: thisTrade.currency,
        openingDate: thisTrade.openingDate.getTime(),
        closingDate: thisTrade.closingDate ? thisTrade.closingDate.getTime() : undefined,
        status: thisTrade.status,
        duration: thisTrade.duration,
        strategy: thisTrade.strategy,
        strategyLabel: TradeStrategy[thisTrade.strategy],
        risk: thisTrade.risk,
        pnl: thisTrade.PnL,
        apy,
        comment: thisTrade.comment,
        statements: undefined,
      };
      return thisTrade.statements
        ?.reduce((p, item) => {
          return p.then((statements) => {
            const statement: StatementEntry = {
              id: item.id,
              date: item.date.getTime(),
              type: item.statementType,
              currency: item.currency,
              amount: item.amount,
              pnl: undefined,
              fees: undefined,
              fxRateToBase: item.fxRateToBase,
              description: item.description,
              trade_id: item.trade_unit_id,
              underlying: { id: thisTrade.stock.id, symbol: thisTrade.stock.symbol },
            };
            switch (item.statementType) {
              case StatementTypes.EquityStatement:
                return EquityStatement.findByPk(item.id).then((thisStatement) => {
                  // console.log(value);
                  statement.pnl = thisStatement?.realizedPnL;
                  statement.fees = thisStatement?.fees;
                  statements.push(statement);
                  return statements;
                });
                break;
              case StatementTypes.OptionStatement:
                return OptionStatement.findByPk(item.id).then((thisStatement) => {
                  statement.pnl = thisStatement?.realizedPnL;
                  statement.fees = thisStatement?.fees;
                  statements.push(statement);
                  return statements;
                });
                break;
              case StatementTypes.DividendStatement:
              case StatementTypes.TaxStatement:
              case StatementTypes.InterestStatement:
                statement.pnl = item.amount;
                statements.push(statement);
                return statements;
                break;
              case StatementTypes.FeeStatement:
                statement.fees = item.amount;
                statements.push(statement);
                return statements;
                break;
              case StatementTypes.CorporateStatement:
              case StatementTypes.CashStatement:
                statements.push(statement);
                return statements;
                break;
              default:
                throw Error("Undefined statement type: " + item.statementType);
            }
          });
        }, Promise.resolve([] as StatementEntry[]))
        .then((statements) => {
          trade.statements = statements;
          return trade;
        });
    })
    .then((trade) => {
      // console.log(trade);
      res.status(200).json({ trade });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({ error });
    });
});

/**
 * Catch all url
 */
router.get("*", (req, _res, next): void => {
  console.log("unknown trades path:", req.path);
  next();
});

export default router;
