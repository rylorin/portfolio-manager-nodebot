import logger, { LogLevel } from "../logger";
import { Contract, Currency, Portfolio, Position, Trade } from "../models";
import { expirationToDate } from "../models/date_utils";
import { ContractType, OptionType, StatementTypes, TradeStatus, TradeStrategy } from "../models/types";
import { preparePositions } from "./positions.router";
import { prepareStatements } from "./statements.utils";
import {
  OpenTradesWithPositions,
  TradeEntry,
  TradeMonthlySynthesys,
  TradeSynthesys,
  VirtualPositionEntry,
} from "./trades.types";
import {
  OptionPositionEntry,
  PositionEntry,
  StatementEntry,
  StatementUnderlyingEntry,
  StatementUnderlyingOption,
} from "./types";

const MODULE = "TradesUtils";

const initVirtualFromStatement = (item: StatementEntry): VirtualPositionEntry => {
  let id: number;
  let contract: StatementUnderlyingEntry | StatementUnderlyingOption;
  switch (item.statementType) {
    case StatementTypes.EquityStatement:
      id = item.underlying!.id;
      contract = item.underlying!;
      break;
    case StatementTypes.OptionStatement:
      id = item.option!.id;
      contract = item.option!;
      break;
    default:
      logger.log(LogLevel.Error, MODULE + ".initVirtualFromStatement", undefined, "unimplemented statement type");
  }
  return {
    id: -id!, // Virtual positions have negative id, but are indexed with positive id
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
 * Update virtuals using a single statement
 * @param virtuals
 * @param statement_entry
 * @returns
 */
const updateVirtuals = (
  virtuals: Record<number, VirtualPositionEntry>,
  statement_entry: StatementEntry,
): Record<number, VirtualPositionEntry> => {
  let id;
  let virtual;
  switch (statement_entry.statementType) {
    case StatementTypes.EquityStatement:
      if (statement_entry.underlying) {
        id = statement_entry.underlying.id;
        if (!virtuals[id]) virtuals[id] = initVirtualFromStatement(statement_entry);
        virtual = virtuals[id];
        virtual.pru = virtual.cost / virtual.quantity;
        virtual.price = statement_entry.underlying?.price;
        virtual.pnl = virtual.pnl ? virtual.pnl + statement_entry.pnl! : statement_entry.pnl!;
        virtual.quantity += statement_entry.quantity!;
      }
      break;
    case StatementTypes.OptionStatement:
      id = statement_entry.option!.id;
      if (!virtuals[id]) virtuals[id] = initVirtualFromStatement(statement_entry);
      virtual = virtuals[id];
      virtual.pru = virtual.cost / virtual.quantity / statement_entry.option!.multiplier;
      virtual.price = statement_entry.option.price;
      virtual.pnl = virtual.pnl ? virtual.pnl + statement_entry.pnl! : statement_entry.pnl!;
      virtual.quantity += statement_entry.quantity!;
      break;
  }
  if (virtual) {
    virtual.cost -= statement_entry.amount;
    if (!virtual.quantity) virtual.cost = 0; // is this usefull?
  }

  return virtuals;
};

/**
 * Build virtual positions from statements
 * @param statements
 * @returns
 */
const makeVirtualPositions = (statements: StatementEntry[] | undefined): Record<number, VirtualPositionEntry> => {
  const virtuals: Record<number, VirtualPositionEntry> = {};
  statements?.forEach((item) => updateVirtuals(virtuals, item));
  return virtuals;
};

/**
 * Compute expected expiry
 * @param thisTrade
 * @param virtuals
 */
const updateTradeExpiry = (thisTrade: Trade, virtuals: Record<number, VirtualPositionEntry>): void => {
  let totalQty = 0;
  thisTrade.expectedExpiry = null;
  Object.values(virtuals).forEach((item) => {
    if (
      item.quantity &&
      (item.contract.secType == ContractType.Option || item.contract.secType == ContractType.FutureOption)
    ) {
      if (!thisTrade.expectedExpiry)
        thisTrade.expectedExpiry = (item.contract as StatementUnderlyingOption).lastTradeDate;
      else if (thisTrade.expectedExpiry < (item.contract as StatementUnderlyingOption).lastTradeDate)
        thisTrade.expectedExpiry = (item.contract as StatementUnderlyingOption).lastTradeDate;
    }
    totalQty += item.quantity;
  });
  if (thisTrade.status == TradeStatus.undefined) thisTrade.status = totalQty ? TradeStatus.open : TradeStatus.closed;
};

/**
 * updateTradeDetails automatically update some trade's details
 * @param thisTrade
 * @returns
 */
export const updateTradeDetails = async (thisTrade: Trade): Promise<Trade> => {
  // logger.log(LogLevel.Trace, MODULE + ".updateTradeDetails", thisTrade.underlying?.symbol, "thisTrade", thisTrade);
  if (thisTrade && thisTrade.statements?.length) {
    // sort statements by date
    const statements = thisTrade.statements.sort((a, b) => a.date.getTime() - b.date.getTime());
    thisTrade.openingDate = statements[0].date;
    if (thisTrade.status == TradeStatus.closed && !thisTrade.closingDate) {
      // closing date is last trade (or trade option) statement date
      thisTrade.closingDate = thisTrade.openingDate;
      for (let i = statements.length - 1; i > 0; --i) {
        if (
          statements[i].statementType == StatementTypes.EquityStatement ||
          statements[i].statementType == StatementTypes.OptionStatement ||
          statements[i].statementType == StatementTypes.BondStatement
        ) {
          // console.log(items[i]);
          if (statements[i].date > thisTrade.closingDate) thisTrade.closingDate = statements[i].date;
          break;
        }
      }
    } else if (thisTrade.status != TradeStatus.closed) thisTrade.closingDate = null;
    thisTrade.PnL = 0;
    thisTrade.pnlInBase = 0;
    return prepareStatements(statements) // Convert Statement[] to StatementEntry[]
      .then(async (statement_entries) => {
        // TODO: computeRisk_Generic could compute and return virtuals
        computeRisk_Generic(thisTrade, statement_entries);
        const virtuals = makeVirtualPositions(statement_entries);
        updateTradeExpiry(thisTrade, virtuals);
        return thisTrade.save();
      });
  }
  return Promise.resolve(thisTrade);
};

/**
 * Convert a trade model to something that is JSONable and easier to manipulate from frontend
 * @param thisTrade
 * @param _options
 * @returns
 */
export const tradeModelToTradeEntry = async (
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
    portfolioId: thisTrade.portfolio_id,
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
    .then(async (trade_entry) => {
      // Add statements
      if (thisTrade.statements) {
        return prepareStatements(thisTrade.statements).then((statements) => {
          trade_entry.statements = statements;
          return trade_entry;
        });
      } else return trade_entry;
    })
    .then(async (trade_entry) => {
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
      }).then(async (portfolio) => {
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
export const addFakeTrades = (theSynthesys: OpenTradesWithPositions): TradeEntry[] => {
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

const _getExpiration = (item: PositionEntry | OptionPositionEntry): string | undefined => {
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

type StockSummary = Record<number, { contract: StatementUnderlyingEntry; cost: number; quantity: number }>;
type OptionSummary = Record<number, { cost: number; quantity: number }>;

/**
 * Compute a combo position risk. A negative risk is the potential loss implied from the trade.
 * @param thisTrade
 * @param virtuals
 * @returns
 */
const computeComboRisk = (thisTrade: Trade, virtuals: Record<number, VirtualPositionEntry>): number => {
  let cash_risk = 0; // What impact do we already have on cash?
  const stocks: StockSummary = {};
  const calls: OptionSummary = {};
  const puts: OptionSummary = {};
  const limits = [0];
  Object.values(virtuals).forEach((item) => {
    cash_risk -= item.cost;
    switch (item.contract.secType) {
      case ContractType.Stock:
      case ContractType.Bond:
        if (item.quantity) limits.push(item.cost / item.quantity);
        stocks[item.contract.id] = { contract: item.contract, cost: item.cost, quantity: item.quantity };
        break;
      case ContractType.Option:
      case ContractType.FutureOption:
        if (item.quantity && !((item.contract as StatementUnderlyingOption).strike in limits))
          limits.push((item.contract as StatementUnderlyingOption).strike);
        switch ((item.contract as StatementUnderlyingOption).callOrPut) {
          case OptionType.Call:
            if (calls[(item.contract as StatementUnderlyingOption).strike])
              calls[(item.contract as StatementUnderlyingOption).strike] = {
                cost: calls[(item.contract as StatementUnderlyingOption).strike].cost + item.cost,
                quantity:
                  calls[(item.contract as StatementUnderlyingOption).strike].quantity +
                  item.quantity * (item.contract as StatementUnderlyingOption).multiplier,
              };
            else
              calls[(item.contract as StatementUnderlyingOption).strike] = {
                cost: item.cost,
                quantity: item.quantity * (item.contract as StatementUnderlyingOption).multiplier,
              };
            break;
          case OptionType.Put:
            if (puts[(item.contract as StatementUnderlyingOption).strike])
              puts[(item.contract as StatementUnderlyingOption).strike] = {
                cost: puts[(item.contract as StatementUnderlyingOption).strike].cost + item.cost,
                quantity:
                  puts[(item.contract as StatementUnderlyingOption).strike].quantity +
                  item.quantity * (item.contract as StatementUnderlyingOption).multiplier,
              };
            else
              puts[(item.contract as StatementUnderlyingOption).strike] = {
                cost: item.cost,
                quantity: item.quantity * (item.contract as StatementUnderlyingOption).multiplier,
              };
            break;
        }
        break;
      default:
        logger.log(
          LogLevel.Error,
          MODULE + ".computeComboRisk",
          undefined,
          "Unimplemented SecType: " + item.contract.secType,
        );
    }
  });
  limits.sort((a, b) => a - b);
  limits.push(limits[limits.length - 1] * 2);

  console.log(thisTrade.id, "stocks", stocks, "puts", puts, "calls", calls);
  console.log(thisTrade.id, "limits", limits);

  let options_risk = 0;
  for (let i = 0; i < limits.length; i++) {
    const price = limits[i]; // Compute cost for this price

    // How much do we get if we close stock position
    const stocks_risk = Object.values(stocks).reduce((p, v) => p + price * v.quantity, 0);

    let put_risks = 0;
    let calls_risk = 0;
    for (let j = 0; j < limits.length; j++) {
      const strike = limits[j];
      if (puts[strike]) {
        if (price <= strike) {
          // ITM Put
          if (puts[strike].quantity < 0)
            // short puts will be assigned. Example: strike = 300, price = 100, risk = -200
            put_risks += (strike - price) * puts[strike].quantity;
          else if (puts[strike].quantity > 0)
            // long puts will be exercized. Example: strike = 300, price = 100, risk = 200
            put_risks += (strike - price) * puts[strike].quantity;
        } else {
          // OTM puts voids
        }
      }
      if (calls[strike]) {
        if (price >= strike) {
          // ITM Call
          if (calls[strike].quantity < 0)
            // short calls will be assigned. Example: strike = 400, price = 600, risk = -200
            calls_risk += (price - strike) * calls[strike].quantity;
          else if (calls[strike].quantity > 0)
            // long calls will be exercized. Example: strike = 400, price = 600, risk = 200
            calls_risk += (price - strike) * calls[strike].quantity;
        } else {
          // OTM calls voids
        }
      }
    }
    console.log(thisTrade.id, "price", price, cash_risk, stocks_risk, put_risks, calls_risk);
    options_risk = Math.min(options_risk, stocks_risk + put_risks + calls_risk);
  }

  return cash_risk + options_risk;
};

const countContratTypes = (virtuals: Record<number, VirtualPositionEntry>): number[] => {
  let long_stock = 0;
  let short_stock = 0;
  let long_put = 0;
  let short_put = 0;
  let long_call = 0;
  let short_call = 0;
  Object.values(virtuals).forEach((item) => {
    switch (item.contract.secType) {
      case ContractType.Stock:
        if (item.quantity > 0) long_stock += 1;
        else if (item.quantity < 0) short_stock += 1;
        break;
      case ContractType.Option:
      case ContractType.FutureOption:
        switch ((item.contract as StatementUnderlyingOption).callOrPut) {
          case OptionType.Call:
            if (item.quantity > 0) long_call += 1;
            else if (item.quantity < 0) short_call += 1;
            break;
          case OptionType.Put:
            if (item.quantity > 0) long_put += 1;
            else if (item.quantity < 0) short_put += 1;
            break;
        }
        break;
      default:
        logger.log(
          LogLevel.Error,
          MODULE + ".computeTradeStrategy",
          undefined,
          "Unimplemented SecType: " + item.contract.secType,
        );
    }
  });
  return [long_stock, short_stock, long_call, short_call, long_put, short_put];
};

const computeTradeStrategy = (thisTrade: Trade, virtuals: Record<number, VirtualPositionEntry>): void => {
  let strategy: TradeStrategy = TradeStrategy.undefined;
  const [long_stock, short_stock, long_call, short_call, long_put, short_put] = countContratTypes(virtuals);
  // console.log(
  //   thisTrade.id,
  //   "computeTradeStrategy",
  //   long_stock,
  //   short_stock,
  //   long_put,
  //   short_put,
  //   long_call,
  //   short_call,
  // );
  if (long_stock > 0) {
    // Longs stock strategies
    if (short_call > 0) {
      const stocks_cost = Object.values(virtuals)
        .filter((item) => item.contract.secType == ContractType.Stock && item.quantity)
        .reduce((p, v) => p + v.cost, 0);
      const stocks_quantity = Object.values(virtuals)
        .filter((item) => item.contract.secType == ContractType.Stock)
        .reduce((p, v) => p + v.quantity, 0);
      const strike = Object.values(virtuals)
        .filter(
          (item) =>
            item.contract.secType == ContractType.Option &&
            (item.contract as StatementUnderlyingOption).callOrPut == OptionType.Call,
        )
        .reduce((p, v) => Math.min(p, (v.contract as StatementUnderlyingOption).strike), Infinity);
      if (strike < stocks_cost / stocks_quantity) strategy = TradeStrategy["buy write"];
      else strategy = TradeStrategy["covered short call"];
    } else strategy = TradeStrategy["long stock"];
  } else if (short_stock > 0) {
    // Shorts stock strategies
    strategy = TradeStrategy["short stock"];
  } else {
    // Strategies without any stock leg
    if (short_put > 0 && long_put > 0 && short_put > long_put && short_call == 0 && !long_call)
      strategy = TradeStrategy["front ratio spread"];
    else if (long_call > 0 && short_call > long_call && !short_put && !long_put)
      strategy = TradeStrategy["front ratio spread"];
    else if (short_put > 0 && long_put == 0 && short_call == 0 && !long_call) strategy = TradeStrategy["short put"];
    else if (short_put == 0 && long_put > 0 && short_call == 0 && !long_call) strategy = TradeStrategy["long put"];
    else if (short_call > 0 && !long_call && !short_put && !long_put) strategy = TradeStrategy["naked short call"];
    else if (!short_call && long_call > 0 && !short_put && !long_put) strategy = TradeStrategy["long call"];
    else if (!short_call && long_call > 0 && short_put > 0 && !long_put) strategy = TradeStrategy["risk reversal"];
    else if (short_call && !long_call && short_put && !long_put)
      strategy = TradeStrategy["short strangle"]; // Could be short straddle also
    else if (short_call && short_call == long_call && short_put == long_put && long_call == long_put)
      strategy = TradeStrategy["iron condor"]; // could be reverse iron condor also
  }
  // console.log(thisTrade.id, "strategy", thisTrade.strategy, strategy);
  if (!thisTrade.strategy) thisTrade.strategy = strategy;
};

const updateTradeStrategy = (thisTrade: Trade, virtuals: Record<number, VirtualPositionEntry>): void => {
  const [long_stock, _short_stock, _long_call, short_call, _long_put, _short_put] = countContratTypes(virtuals);
  if (
    (thisTrade.strategy == TradeStrategy["short put"] || thisTrade.strategy == TradeStrategy["risk reversal"]) &&
    long_stock > 0 &&
    short_call > 0
  )
    thisTrade.strategy = TradeStrategy["the wheel"];
};

const computeRisk_Generic = (thisTrade: Trade, statements: StatementEntry[]): Record<number, VirtualPositionEntry> => {
  const virtuals: Record<number, VirtualPositionEntry> = {};

  thisTrade.PnL = 0;
  thisTrade.pnlInBase = 0;
  thisTrade.risk = 0;

  // Process statements. Assume they have been sorted by date
  let first_time = true;
  for (let i = 0; i < statements.length; i++) {
    const statement_entry = statements[i];

    // Update trade PnL, whatever statement type is
    if ("pnl" in statement_entry) {
      thisTrade.PnL += statement_entry.pnl;
      thisTrade.pnlInBase += statement_entry.pnl * statement_entry.fxRateToBase;
    }

    updateVirtuals(virtuals, statement_entry);
    if (
      i + 1 == statements.length || // Last statement or
      (i + 1 < statements.length && statements[i + 1].date > statement_entry.date + 10 * 60 * 1000) // Consider a 10 mins timeframe for a single operation
    ) {
      // last statement or last statement from this timeframe
      if (first_time) computeTradeStrategy(thisTrade, virtuals);
      else updateTradeStrategy(thisTrade, virtuals);
      const comboRisk = computeComboRisk(thisTrade, virtuals);
      console.log(thisTrade.id, "computeRisk_Generic", thisTrade.risk, comboRisk, thisTrade.PnL);
      thisTrade.risk = Math.min(thisTrade.risk, thisTrade.PnL + comboRisk);
      first_time = false;
    }
  }

  // Sum costs of open positions to compute expiry P&L
  thisTrade.expiryPnl = Object.values(virtuals).reduce((p, item) => (item.quantity ? p + item.cost : p), 0);

  // All done
  return virtuals;
};

export const makeSynthesys = async (trades: Trade[]): Promise<TradeSynthesys> => {
  return trades.reduce(
    async (p, item) =>
      p.then(async (theSynthesys) => {
        if (item.closingDate) {
          const idx = formatDate(item.openingDate);
          if (theSynthesys.byMonth[idx] === undefined) {
            theSynthesys.byMonth[idx] = { count: 0, success: 0, duration: 0, min: undefined, max: undefined, total: 0 };
          }
          theSynthesys.byMonth[idx].count += 1;
          theSynthesys.byMonth[idx].duration += item.duration;
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

export const prepareTrades = async (trades: Trade[]): Promise<TradeEntry[]> => {
  return trades.reduce(
    async (p, item) =>
      p.then(async (trades) =>
        tradeModelToTradeEntry(item).then((trade) => {
          trades.push(trade);
          return trades;
        }),
      ),
    Promise.resolve([] as TradeEntry[]),
  );
};
