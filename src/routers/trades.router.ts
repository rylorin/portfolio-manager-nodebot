import { OptionType } from "@stoqey/ib";
import express from "express";
import { Op } from "sequelize";
import logger, { LogLevel } from "../logger";
import { Contract, ContractType, Currency, Portfolio, Position, Statement, StatementTypes, Trade } from "../models";
import { expirationToDate } from "../models/date_utils";
import { TradeStatus, TradeStrategy } from "../models/trade.types";
import { preparePositions } from "./positions.router";
import { OptionPositionEntry, PositionEntry } from "./positions.types";
import { prepareStatements } from "./statements.router";
import { StatementEntry, StatementOptionEntry, StatementUnderlyingEntry } from "./statements.types";
import {
  OpenTradesWithPositions,
  TradeEntry,
  TradeMonthlySynthesys,
  TradeSynthesys,
  VirtualPositionEntry,
} from "./trades.types";

const MODULE = "TradesRouter";

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
const _sequelize_logging = (...args: any[]): void => logger.trace(MODULE + ".squelize", ...args);

const router = express.Router({ mergeParams: true });

type parentParams = { portfolioId: number };

const initVirtualFromStatement = (item: StatementEntry): VirtualPositionEntry => {
  let id: number;
  let contract: StatementUnderlyingEntry | StatementOptionEntry;
  switch (item.statementType) {
    case StatementTypes.EquityStatement:
      id = -item.underlying!.id;
      contract = item.underlying!;
      break;
    case StatementTypes.OptionStatement:
      id = -item.option!.id;
      contract = item.option!;
      break;
  }
  return {
    id: id!,
    openDate: item.date,
    quantity: 0,
    contract: contract!,
    trade_id: item.trade_id!,
    price: null,
    value: undefined,
    pru: 0,
    cost: 0,
    pnl: 0,
  };
};

/**
 * Build virtual positions from statements
 * @param statements
 * @returns
 */
const makeVirtualPositions = (statements: StatementEntry[] | undefined): Record<number, VirtualPositionEntry> => {
  const virtuals: Record<number, VirtualPositionEntry> = {};
  statements?.forEach((item) => {
    let id;
    let virtual;
    switch (item.statementType) {
      case StatementTypes.EquityStatement:
        if (item.underlying) {
          id = item.underlying.id;
          if (!virtuals[id]) virtuals[id] = initVirtualFromStatement(item);
          virtual = virtuals[id];
        }
        break;
      case StatementTypes.OptionStatement:
        id = item.option!.id;
        if (!virtuals[id]) virtuals[id] = initVirtualFromStatement(item);
        virtual = virtuals[id];
        break;
    }
    if (virtual) {
      virtual.quantity += item.quantity!;
      virtual.cost -= item.amount;
      virtual.pru = item.option?.multiplier
        ? virtual.cost / virtual.quantity / item.option!.multiplier
        : virtual.cost / virtual.quantity;
      virtual.pnl = virtual.pnl ? virtual.pnl + item.pnl! : item.pnl!;
      virtual.price = item.option?.price ? item.option.price : item.underlying?.price;

      if (!virtual.quantity) virtual.cost = 0;
    }
  });
  return virtuals;
};

const _updateTradeExpiry = (thisTrade: Trade, statements: StatementEntry[]): StatementEntry[] => {
  // Compute expected expiry
  const virtuals = makeVirtualPositions(statements);
  thisTrade.expectedExpiry = null;

  Object.values(virtuals).forEach((pos) => {
    if (pos.contract.secType == ContractType.Option && pos.quantity) {
      if (!thisTrade.expectedExpiry) thisTrade.expectedExpiry = (pos.contract as StatementOptionEntry).lastTradeDate;
      else if (thisTrade.expectedExpiry < (pos.contract as StatementOptionEntry).lastTradeDate)
        thisTrade.expectedExpiry = (pos.contract as StatementOptionEntry).lastTradeDate;
    }
  });
  return statements;
};

/**
 * updateTradeDetails automatically update some trade's details
 * @param thisTrade
 * @returns
 */
export const updateTradeDetails = (thisTrade: Trade): Promise<Trade> => {
  // logger.log(LogLevel.Trace, MODULE + ".updateTradeDetails", thisTrade.underlying?.symbol, "thisTrade", thisTrade);
  if (thisTrade && thisTrade.statements?.length) {
    // sort statements by date
    const items = thisTrade.statements.sort((a, b) => a.date.getTime() - b.date.getTime());
    thisTrade.openingDate = items[0].date;
    if (thisTrade.status == TradeStatus.closed && !thisTrade.closingDate) {
      // closing date is last trade (or trade option) statement date
      thisTrade.closingDate = thisTrade.openingDate;
      for (let i = items.length - 1; i > 0; --i) {
        if (
          items[i].statementType == StatementTypes.EquityStatement ||
          items[i].statementType == StatementTypes.OptionStatement
        ) {
          // console.log(items[i]);
          thisTrade.closingDate = items[i].date;
          break;
        }
      }
    } else if (thisTrade.status != TradeStatus.closed) thisTrade.closingDate = null;
    thisTrade.PnL = 0;
    thisTrade.pnlInBase = 0;
    return (
      prepareStatements(items) // Convert Statement[] to StatementEntry[]
        .then((statements) => computeRisk_Generic(thisTrade, statements))
        // .then((statements) => updateTradeExpiry(thisTrade, statements))
        .then((_statements) => thisTrade.save())
    );
  }
  return Promise.resolve(thisTrade);
};

/**
 * Convert a trade model to something that is JSONable and easier to manipulate from frontend
 * @param thisTrade
 * @param _options
 * @returns
 */
export const tradeModelToTradeEntry = (
  thisTrade: Trade,
  _options: { with_statements: boolean; with_positions: boolean; with_virtuals: boolean } = {
    with_statements: false,
    with_positions: false,
    with_virtuals: false,
  },
): Promise<TradeEntry> => {
  // Init TradeEntry
  return Promise.resolve({
    id: thisTrade.id,
    underlying: thisTrade.underlying,
    currency: thisTrade.currency,
    openingDate: thisTrade.openingDate.getTime(),
    closingDate: thisTrade.closingDate ? thisTrade.closingDate.getTime() : undefined,
    status: thisTrade.status,
    duration: thisTrade.duration,
    expectedExpiry: thisTrade.expectedExpiry,
    expectedDuration: thisTrade.expectedDuration,
    strategy: thisTrade.strategy,
    risk: thisTrade.risk,
    pnl: thisTrade.PnL,
    unrlzdPnl: thisTrade.expiryPnl,
    pnlInBase: thisTrade.pnlInBase,
    apy:
      thisTrade.risk && thisTrade.expectedDuration
        ? -((thisTrade.PnL! + thisTrade.expiryPnl!) / thisTrade.risk) * (360 / thisTrade.expectedDuration)
        : undefined,
    comment: thisTrade.comment,
    statements: undefined,
    positions: undefined,
    virtuals: undefined,
  } as TradeEntry)
    .then((trade_entry) => {
      // Add statements
      if (thisTrade.statements) {
        return prepareStatements(thisTrade.statements).then((statements) => {
          trade_entry.statements = statements;
          return trade_entry;
        });
      } else return trade_entry;
    })
    .then((trade_entry) => {
      // Add positions
      return Portfolio.findByPk(thisTrade.portfolio_id, {
        include: [
          {
            model: Position,
            as: "positions",
            where: { trade_unit_id: thisTrade.id },
            include: [{ model: Contract, as: "contract" }],
            required: false,
          },
          { model: Currency, as: "baseRates" },
        ],
      }).then((portfolio) => {
        if (!portfolio) throw Error("portfolio not found: " + thisTrade.portfolio_id);
        return preparePositions(portfolio).then((positions) => {
          trade_entry.positions = positions;
          return trade_entry;
        });
      });
    })
    .then((trade_entry) => {
      const virtuals = makeVirtualPositions(trade_entry.statements);
      trade_entry.virtuals = Object.values(virtuals);
      return trade_entry;
    });
};

const formatDate = (when: Date): string => {
  const datestr = when.toISOString().substring(0, 7);
  return datestr;
};

/**
 * Create fake trade entries for orphan positions
 * @param theSynthesys
 * @returns
 */
const addFakeTrades = (theSynthesys: OpenTradesWithPositions): TradeEntry[] => {
  theSynthesys.positions = theSynthesys.positions.filter((pos) => !pos.trade_id);
  while (theSynthesys.positions.length) {
    const underlying =
      "underlying" in theSynthesys.positions[0]
        ? theSynthesys.positions[0].underlying.symbol
        : theSynthesys.positions[0].contract.symbol;
    const currency = theSynthesys.positions[0].contract.currency;
    const positions = theSynthesys.positions.filter(
      (pos) => pos.quantity && ("underlying" in pos ? pos.underlying.symbol : pos.contract.symbol) == underlying,
    );
    // console.log("addFakeTrades", underlying, positions);
    theSynthesys.positions = theSynthesys.positions.filter(
      (pos) => pos.quantity && ("underlying" in pos ? pos.underlying.symbol : pos.contract.symbol) !== underlying,
    );
    let id = 0;
    let openingDate = Date.now();
    let expectedExpiry: string | undefined = undefined;
    let expectedDuration: number | undefined = undefined;
    positions.forEach((pos) => {
      id = Math.min(id, -pos.id);
      openingDate = Math.min(openingDate, pos.openDate);
      if (pos.contract.secType == ContractType.Option) {
        if (!expectedExpiry) expectedExpiry = (pos as OptionPositionEntry).option.expiration;
        else if (expectedExpiry < (pos as OptionPositionEntry).option.expiration)
          expectedExpiry = (pos as OptionPositionEntry).option.expiration;
        expectedDuration = Math.max((expirationToDate(expectedExpiry).getTime() - openingDate) / 1000 / 3600 / 24, 0);
      }
    });
    const duration = (Date.now() - openingDate) / 1000 / 3600 / 24;
    theSynthesys.trades.push({
      id,
      underlying: { id: -1, symbol: underlying, secType: ContractType.Stock, currency },
      currency,
      openingDate,
      status: TradeStatus.open,
      closingDate: undefined,
      duration,
      expectedExpiry,
      expectedDuration,
      strategy: TradeStrategy.undefined,
      risk: undefined,
      pnl: undefined,
      unrlzdPnl: undefined,
      pnlInBase: undefined,
      apy: undefined,
      comment: undefined,
      statements: undefined,
      virtuals: undefined,
      positions,
    } as TradeEntry);
  }
  return theSynthesys.trades;
};

const getExpiration = (item: PositionEntry | OptionPositionEntry): string | undefined => {
  switch (item.contract.secType) {
    case ContractType.Stock:
      return undefined;
    case ContractType.Option:
    case ContractType.FutureOption:
      return (item as OptionPositionEntry).option.expiration;
    case ContractType.Future:
      return item.contract.expiration;
    default:
      logger.error(MODULE + ".getExpiration", "not implemented", item);
      throw Error("not implemented!");
  }
};

const comparePositions = (a: PositionEntry | OptionPositionEntry, b: PositionEntry | OptionPositionEntry): number => {
  let result: number;
  const aExpiration = getExpiration(a);
  const bExpiration = getExpiration(b);
  if (!aExpiration && !bExpiration) return a.contract.symbol.localeCompare(b.contract.symbol);
  else if (!aExpiration) return +1;
  else if (!bExpiration) return -1;
  else {
    result = aExpiration.localeCompare(bExpiration);
    if (!result) {
      result = (a as OptionPositionEntry).option.symbol.localeCompare((b as OptionPositionEntry).option.symbol);
      if (!result) result = (a as OptionPositionEntry).option.strike - (b as OptionPositionEntry).option.strike;
    }
    return result;
  }
};

const _sortTrades = (trades: TradeEntry[]): TradeEntry[] => {
  trades.forEach((trade) => {
    trade.positions = trade.positions?.sort(comparePositions);
  });
  return trades;
};

type StockSummary = { contract: Contract; risk: number; cost: number; quantity: number };
type OptionSummary = Record<number, { contract: StatementOptionEntry; risk: number; cost: number; quantity: number }>;

const computeComboRisk = (
  thisTrade: Trade,
  stocks: StockSummary,
  calls: OptionSummary,
  puts: OptionSummary,
): number => {
  console.log(thisTrade.id, "stocks", stocks, "puts", puts, "calls", calls);
  // Risk is cash in/out
  const cash_risk =
    // stocks.cost +
    Object.values(puts).reduce((p, item) => p + item.cost, 0) +
    Object.values(calls).reduce((p, item) => p + item.cost, 0);
  console.log(thisTrade.id, "cash_risk", cash_risk);

  // compute limit points: each strike + 0 + max strike * 2 (could be more but cross fingers)
  const limits = [0];
  if (stocks.quantity) limits.push(-stocks.cost / stocks.quantity);
  Object.values(puts).forEach((item) => {
    if (item.quantity && !(item.contract.strike in limits)) limits.push(item.contract.strike);
  });
  Object.values(calls).forEach((item) => {
    if (item.quantity && !(item.contract.strike in limits)) limits.push(item.contract.strike);
  });
  limits.sort((a, b) => a - b);
  limits.push(limits[limits.length - 1] * 2);
  // console.log(thisTrade.id, "limits", limits);

  let options_risk = 0;
  for (let i = 0; i < limits.length; i++) {
    const price = limits[i]; // Compute cost for this price

    const stocks_risk = stocks.cost + stocks.quantity * price;

    let put_risks = 0;
    let calls_risk = 0;
    for (let j = 0; j < limits.length; j++) {
      const strike = limits[j];
      if (puts[strike]) {
        if (price <= strike) {
          // ITM Put
          if (puts[strike].quantity < 0)
            // short puts will be assigned. Example: strike = 300, price = 100, risk = -200
            put_risks += (strike - price) * puts[strike].quantity * puts[strike].contract.multiplier;
          else if (puts[strike].quantity > 0)
            // long puts will be exercized. Example: strike = 300, price = 100, risk = 200
            put_risks += (strike - price) * puts[strike].quantity * puts[strike].contract.multiplier;
        } else {
          // OTM puts voids
        }
      }
      if (calls[strike]) {
        if (price >= strike) {
          // ITM Call
          if (calls[strike].quantity < 0)
            // short calls will be assigned. Example: strike = 400, price = 600, risk = -200
            calls_risk += (price - strike) * calls[strike].quantity * calls[strike].contract.multiplier;
          else if (calls[strike].quantity > 0)
            // long calls will be exercized. Example: strike = 400, price = 600, risk = 200
            calls_risk += (price - strike) * calls[strike].quantity * calls[strike].contract.multiplier;
        } else {
          // OTM calls voids
        }
      }
    }
    console.log(thisTrade.id, "price", price, stocks_risk, put_risks, calls_risk);
    options_risk = Math.min(options_risk, stocks_risk + put_risks + calls_risk);
  }

  return cash_risk + options_risk;
};

const computeTradeStrategy = (
  thisTrade: Trade,
  stocks: StockSummary,
  calls: OptionSummary,
  puts: OptionSummary,
): void => {
  let strategy: TradeStrategy = TradeStrategy.undefined;
  const long_stock = stocks.quantity > 0 ? stocks.quantity : 0;
  const short_stock = stocks.quantity < 0 ? -stocks.quantity : 0;
  const long_put = Object.values(puts).reduce((p, item) => p + (item.quantity > 0 ? item.quantity : 0), 0);
  const short_put = Object.values(puts).reduce((p, item) => p + (item.quantity < 0 ? -item.quantity : 0), 0);
  const long_call = Object.values(calls).reduce((p, item) => p + (item.quantity > 0 ? item.quantity : 0), 0);
  const short_call = Object.values(calls).reduce((p, item) => p + (item.quantity < 0 ? -item.quantity : 0), 0);
  if (long_stock > 0) {
    // Longs stock strategies
    if (short_call > 0) {
      const strike = parseInt(Object.keys(calls)[0]);
      if (strike < -stocks.cost / stocks.quantity) strategy = TradeStrategy["buy write"];
      else strategy = TradeStrategy["covered short call"];
    } else strategy = TradeStrategy["long stock"];
  } else if (short_stock > 0) {
    // Shorts stock strategies
    strategy = TradeStrategy["short stock"];
  } else {
    // Strategies without any stock leg
    if (short_put > 0 && long_put > 0 && short_put > long_put && short_call == 0 && !long_call)
      strategy = TradeStrategy["front ratio spread"];
    else if (short_put > 0 && long_put == 0 && short_call == 0 && !long_call) strategy = TradeStrategy["short put"];
    else if (short_put == 0 && long_put > 0 && short_call == 0 && !long_call) strategy = TradeStrategy["long put"];
    else if (short_call > 0 && !long_call && !short_put && !long_put) strategy = TradeStrategy["naked short call"];
    else if (!short_call && long_call > 0 && short_put > 0 && !long_put) strategy = TradeStrategy["risk reversal"];
  }
  // console.log(thisTrade.id, "strategy", thisTrade.strategy, strategy);
  if (!thisTrade.strategy) thisTrade.strategy = strategy;
};

const updateTradeStrategy = (
  thisTrade: Trade,
  stocks: StockSummary,
  calls: OptionSummary,
  puts: OptionSummary,
): void => {
  const long_stock = stocks.quantity > 0 ? stocks.quantity : 0;
  const _short_stock = stocks.quantity < 0 ? -stocks.quantity : 0;
  const _long_put = Object.values(puts).reduce((p, item) => p + (item.quantity > 0 ? item.quantity : 0), 0);
  const _short_put = Object.values(puts).reduce((p, item) => p + (item.quantity < 0 ? -item.quantity : 0), 0);
  const _long_call = Object.values(calls).reduce((p, item) => p + (item.quantity > 0 ? item.quantity : 0), 0);
  const short_call = Object.values(calls).reduce((p, item) => p + (item.quantity < 0 ? -item.quantity : 0), 0);
  if (
    (thisTrade.strategy == TradeStrategy["short put"] || thisTrade.strategy == TradeStrategy["risk reversal"]) &&
    long_stock > 0 &&
    short_call > 0
  )
    thisTrade.strategy = TradeStrategy["the wheel"];
};

const computeRisk_Generic = (thisTrade: Trade, statements: StatementEntry[]): StatementEntry[] => {
  const stocks: StockSummary = {
    contract: thisTrade.underlying,
    risk: 0,
    cost: 0,
    quantity: 0,
  };
  const calls: OptionSummary = {};
  const puts: OptionSummary = {};

  thisTrade.PnL = 0;
  thisTrade.pnlInBase = 0;
  thisTrade.risk = 0;

  // Process statements. Assume they have been sorted by date
  let first_time = true;
  for (let i = 0; i < statements.length; i++) {
    const statement_entry = statements[i];
    if (statement_entry.pnl) {
      thisTrade.PnL += statement_entry.pnl;
      thisTrade.pnlInBase += statement_entry.pnl * statement_entry.fxRateToBase;
    }
    if (statement_entry.statementType == StatementTypes.EquityStatement) {
      stocks.cost += statement_entry.amount;
      stocks.quantity += statement_entry.quantity!;
      stocks.risk += statement_entry.amount;
      if (!stocks.quantity) {
        stocks.risk = 0;
      }
    } else if (statement_entry.statementType == StatementTypes.OptionStatement) {
      if (statement_entry.option!.callOrPut == OptionType.Call) {
        if (!calls[statement_entry.option!.strike])
          calls[statement_entry.option!.strike] = {
            contract: statement_entry.option!,
            risk: 0,
            cost: 0,
            quantity: 0,
          };
        calls[statement_entry.option!.strike].cost += statement_entry.amount;
        calls[statement_entry.option!.strike].quantity += statement_entry.quantity!;
        calls[statement_entry.option!.strike].risk +=
          statement_entry.quantity! > 0
            ? statement_entry.amount
            : -statement_entry.quantity! * statement_entry.option!.strike * statement_entry.option!.multiplier;
        if (!calls[statement_entry.option!.strike].quantity) calls[statement_entry.option!.strike].risk = 0;
      } else {
        if (!puts[statement_entry.option!.strike])
          puts[statement_entry.option!.strike] = {
            contract: statement_entry.option!,
            risk: 0,
            cost: 0,
            quantity: 0,
          };
        puts[statement_entry.option!.strike].cost += statement_entry.amount;
        puts[statement_entry.option!.strike].quantity += statement_entry.quantity!;
        puts[statement_entry.option!.strike].risk +=
          statement_entry.quantity! > 0
            ? statement_entry.amount
            : statement_entry.option!.strike * statement_entry.quantity! * statement_entry.option!.multiplier;
        if (!puts[statement_entry.option!.strike].quantity) puts[statement_entry.option!.strike].risk = 0;
      }
    }
    if (
      i + 1 == statements.length || // Last statement or
      (i + 1 < statements.length && statements[i + 1].date > statement_entry.date + 10 * 60 * 1000) // Consider a 10 mins timeframe for a single operation
    ) {
      // last statement or last statement from this timeframe
      if (first_time) computeTradeStrategy(thisTrade, stocks, calls, puts);
      else updateTradeStrategy(thisTrade, stocks, calls, puts);
      const comboRisk = computeComboRisk(thisTrade, stocks, calls, puts);
      console.log("computeRisk_Generic", thisTrade.id, thisTrade.risk, comboRisk, thisTrade.PnL);
      thisTrade.risk = Math.min(thisTrade.risk, thisTrade.PnL + comboRisk);
      first_time = false;
    }
  }

  // Sum costs of open positions to compute expiry P&L
  thisTrade.expiryPnl =
    Object.values(calls).reduce((p, item) => (item.quantity ? p + item.cost : p), 0) +
    Object.values(puts).reduce((p, item) => (item.quantity ? p + item.cost : p), 0);

  // Compute expected expiry date
  thisTrade.expectedExpiry = null;
  Object.values(calls).forEach((pos) => {
    if (pos.quantity) {
      if (!thisTrade.expectedExpiry) thisTrade.expectedExpiry = pos.contract.lastTradeDate;
      else if (thisTrade.expectedExpiry < pos.contract.lastTradeDate)
        thisTrade.expectedExpiry = pos.contract.lastTradeDate;
    }
  });
  Object.values(puts).forEach((pos) => {
    if (pos.quantity) {
      if (!thisTrade.expectedExpiry) thisTrade.expectedExpiry = pos.contract.lastTradeDate;
      else if (thisTrade.expectedExpiry < pos.contract.lastTradeDate)
        thisTrade.expectedExpiry = pos.contract.lastTradeDate;
    }
  });

  // All done
  return statements;
};

const makeSynthesys = (trades: Trade[]): Promise<TradeSynthesys> => {
  return trades.reduce(
    (p, item) =>
      p.then((theSynthesys) => {
        if (item.closingDate) {
          const idx = formatDate(item.openingDate);
          if (theSynthesys.byMonth[idx] === undefined) {
            theSynthesys.byMonth[idx] = { count: 0, success: 0, duration: 0, min: undefined, max: undefined, total: 0 };
          }
          theSynthesys.byMonth[idx].count += 1;
          theSynthesys.byMonth[idx].duration +=
            (item.closingDate.getTime() - item.openingDate.getTime()) / 1000 / 3600 / 24;
          if (item.pnlInBase) {
            if (item.pnlInBase > 0) theSynthesys.byMonth[idx].success += 1;
            theSynthesys.byMonth[idx].total += item.pnlInBase;
            theSynthesys.byMonth[idx].min = theSynthesys.byMonth[idx].min
              ? Math.min(theSynthesys.byMonth[idx].min as number, item.pnlInBase)
              : item.pnlInBase;
            theSynthesys.byMonth[idx].max = theSynthesys.byMonth[idx].max
              ? Math.max(theSynthesys.byMonth[idx].max as number, item.pnlInBase)
              : item.pnlInBase;
          } else if (item.PnL) {
            // TODO: multiply by baseRate
            if (item.PnL > 0) theSynthesys.byMonth[idx].success += 1;
            theSynthesys.byMonth[idx].total += item.PnL;
            theSynthesys.byMonth[idx].min = theSynthesys.byMonth[idx].min
              ? Math.min(theSynthesys.byMonth[idx].min as number, item.PnL)
              : item.PnL;
            theSynthesys.byMonth[idx].max = theSynthesys.byMonth[idx].max
              ? Math.max(theSynthesys.byMonth[idx].max as number, item.PnL)
              : item.PnL;
          }
          return theSynthesys;
        } else {
          return tradeModelToTradeEntry(item).then((trade) => {
            theSynthesys.open.push(trade);
            return theSynthesys;
          });
        }
      }),
    Promise.resolve({ open: [], byMonth: {} as TradeMonthlySynthesys } as TradeSynthesys),
  );
};

const prepareTrades = (trades: Trade[]): Promise<TradeEntry[]> => {
  return trades.reduce(
    (p, item) =>
      p.then((trades) =>
        tradeModelToTradeEntry(item).then((trade) => {
          trades.push(trade);
          return trades;
        }),
      ),
    Promise.resolve([] as TradeEntry[]),
  );
};

/**
 * Get full trades history synthesys
 */
router.get("/summary/all", (req, res): void => {
  const { portfolioId } = req.params as typeof req.params & parentParams;

  Trade.findAll({
    where: {
      portfolio_id: portfolioId,
      openingDate: {
        [Op.gte]: new Date(2021, 0, 1),
      },
      status: TradeStatus.closed,
    },
    include: [{ model: Contract, as: "underlying" }],
  })
    .then((trades: Trade[]) => makeSynthesys(trades))
    .then((tradessynthesys) => res.status(200).json({ tradessynthesys }))
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".SummaryAll", undefined, error);
      res.status(500).json({ error });
    });
});

/**
 * Get 12M closed trades history synthesys
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
        [Op.gte]: new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()),
      },
      // status: TradeStatus.closed,
    },
    include: [{ model: Contract, as: "underlying" }],
    // limit: 500,
  })
    .then((trades: Trade[]) => makeSynthesys(trades))
    .then((tradessynthesys) => res.status(200).json({ tradessynthesys }))
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Get YTD trades history synthesys
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
        [Op.gte]: new Date(new Date().getFullYear(), 0, 1),
      },
    },
    include: [{ model: Contract, as: "underlying" }],
  })
    .then((trades: Trade[]) => makeSynthesys(trades))
    .then((tradessynthesys) => res.status(200).json({ tradessynthesys }))
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".SummaryYtd", undefined, error);
      res.status(500).json({ error });
    });
});

/**
 * Get trades closed during a given month
 */
router.get("/month/:year(\\d+)/:month(\\d+)", (req, res): void => {
  const { portfolioId, year, month } = req.params as typeof req.params & parentParams;
  const yearval = parseInt(year);
  const monthval = parseInt(month);

  Trade.findAll({
    where: {
      portfolio_id: portfolioId,
      openingDate: {
        [Op.gte]: new Date(yearval, monthval - 1, 1),
        [Op.lt]: new Date(monthval < 12 ? yearval : yearval + 1, monthval < 12 ? monthval : 0, 1),
      },
      status: TradeStatus.closed,
    },
    include: [{ model: Contract, as: "underlying" }, { association: "statements" }],
  })
    .then((trades: Trade[]) => prepareTrades(trades))
    .then((trades) => res.status(200).json({ trades }))
    .catch((error) => {
      console.error(error);
      logger.error(MODULE + ".MonthIndex", error);
      res.status(500).json({ error });
    });
});

/**
 * Get open trades synthesys
 */
router.get("/summary/open", (req, res): void => {
  const { portfolioId } = req.params as typeof req.params & parentParams;

  Trade.findAll({
    where: {
      portfolio_id: portfolioId,
      openingDate: {
        [Op.gte]: new Date(2021, 0, 1),
      },
      status: TradeStatus.open,
    },
    include: [
      { model: Contract, as: "underlying" },
      { association: "statements", include: [{ association: "stock" }] },
    ],
  })
    .then((trades: Trade[]) => prepareTrades(trades))
    .then((trades) => {
      return Portfolio.findByPk(portfolioId, {
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
        .then((positions: PositionEntry[]) => {
          return {
            trades: trades,
            positions,
          } as OpenTradesWithPositions;
        });
    })
    .then((tradessynthesys) => addFakeTrades(tradessynthesys))
    // .then((trades) => sortTrades(trades))
    .then((trades) => res.status(200).json({ trades }))
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".SummaryOpen", undefined, error);
      res.status(500).json({ error });
    });
});

/**
 * Get a single trade
 */
router.get("/id/:tradeId(\\d+)", (req, res): void => {
  const { _portfolioId, tradeId } = req.params as typeof req.params & parentParams;

  Trade.findByPk(tradeId, {
    include: [
      { model: Contract, as: "underlying" },
      { model: Portfolio, as: "portfolio" },
      { model: Statement, as: "statements", include: [{ model: Contract, as: "stock" }] },
      { model: Position, as: "positions", include: [{ model: Contract, as: "contract" }] },
    ],
    // logging: console.log,
  })
    .then((trade) => {
      if (trade) {
        return tradeModelToTradeEntry(trade, { with_statements: true, with_positions: true, with_virtuals: true });
      } else {
        throw Error("trade doesn't exist");
      }
    })
    .then((trade) => {
      res.status(200).json({ trade });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({ error });
    });
});

/**
 * Save a trade
 */
router.post("/id/:tradeId(\\d+)/SaveTrade", (req, res): void => {
  const { portfolioId, tradeId } = req.params as typeof req.params & parentParams;
  const data = req.body as TradeEntry;
  logger.log(LogLevel.Debug, MODULE + ".SaveTrade", undefined, portfolioId, tradeId, data);

  Trade.findByPk(tradeId, {
    include: [
      { model: Contract, as: "underlying", required: false },
      {
        model: Statement,
        as: "statements",
        required: false,
        include: [{ model: Contract, as: "stock", required: false }],
      },
    ],
  })
    .then((trade) => {
      if (trade) {
        trade.status = data.status;
        trade.strategy = data.strategy;
        trade.comment = data.comment ? data.comment : "";
        return trade;
      } else throw Error(`trade id ${tradeId} not found!`);
    })
    .then((trade) => updateTradeDetails(trade))
    .then((trade) => trade.save())
    .then((trade) => res.status(200).json({ trade }))
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".SaveTrade", undefined, JSON.stringify(error));
      res.status(500).json({ error });
    });
});

/**
 * Delete a trade
 */
router.delete("/id/:tradeId(\\d+)/DeleteTrade", (req, res): void => {
  const { portfolioId, tradeId } = req.params as typeof req.params & parentParams;
  logger.log(LogLevel.Debug, MODULE + ".DeleteTrade", undefined, portfolioId, tradeId);

  Position.update({ trade_unit_id: null }, { where: { portfolio_id: portfolioId, trade_unit_id: tradeId } })
    .then(() =>
      Statement.update({ trade_unit_id: null }, { where: { portfolio_id: portfolioId, trade_unit_id: tradeId } }),
    )
    .then(() =>
      Trade.findByPk(tradeId, {
        include: [{ model: Statement, as: "statements", required: false, include: [{ model: Contract, as: "stock" }] }],
      }),
    )
    .then((trade) => {
      if (trade) return trade.destroy();
      else throw Error("trade not found");
    })
    .then(() => res.status(200).end())
    .catch((error) => {
      console.error(error);
      logger.log(LogLevel.Error, MODULE + ".DeleteTrade", undefined, JSON.stringify(error));
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
