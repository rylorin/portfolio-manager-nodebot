import {
  Contract as IbContract,
  Order as IbOrder,
  OptionType,
  OrderAction,
  OrderType,
  SecType,
  TimeInForce,
} from "@stoqey/ib";
import { Op, Order } from "sequelize";
import { ITradingBot, timeoutPromise } from ".";
import logger from "../logger";
import { Balance, Contract, OpenOrder, OptionContract, OptionStatement, Position, Setting } from "../models";
import { dateToExpiration, daysToExpiration, expirationToDate, expirationToDateString } from "../models/date_utils";
import { CashStrategy, cspStrategy2String, CspStrategySetting, StrategySetting } from "../models/types";

const MODULE = "TradeBot";

const GET_MARKET_DATA_BATCH_SIZE = 95;
const GET_MARKET_DATA_DURATION = 16 * 1_000; // IB says 11 but we add a bit overhead for db update
const UPDATE_OPTIONS_BATCH_FACTOR = 3;
const START_AFTER = 15 * 1_000;
const RECENT_UPDATE = Math.max(UPDATE_OPTIONS_BATCH_FACTOR * GET_MARKET_DATA_DURATION * 3, 90_000);
const RUN_INTERVAL = 600_000; // run bot every 10 minutes
const MIN_UNITS_TO_TRADE = 1;
const DEFAULT_TIMEOUT_SECONDS = 20;

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unused-vars
const sequelize_logging = (...args: any[]): void => logger.trace(MODULE + ".squelize", ...args);

enum LongShort {
  Long = "L",
  Short = "S",
}

interface OptionsEval {
  units: number;
  value: number;
  engaged: number;
}

interface OptionsEval2 {
  stocks: OptionsEval;
  [OptionType.Put]: OptionsEval;
  [OptionType.Call]: OptionsEval;
}

interface PositionsEval {
  [LongShort.Long]: OptionsEval2;
  [LongShort.Short]: OptionsEval2;
}

interface OrdersEval {
  [OrderAction.BUY]: OptionsEval2;
  [OrderAction.SELL]: OptionsEval2;
}

export class TradeBot extends ITradingBot {
  timer: NodeJS.Timeout;

  private async findUpdatedContract(contract: number | Contract): Promise<Contract> {
    if (!contract) return null;
    else if (typeof contract == "number") contract = await Contract.findByPk(contract);
    if (Date.now() - contract.updatedAt.getTime() < RECENT_UPDATE) {
      // we already have a recent contract
      return contract;
    } else {
      return Promise.race([
        this.api
          .getMarketDataSnapshot(contract as IbContract, "", false)
          .then(async (marketData) => this.updateContratPrice(contract, marketData))
          .then(async (_price) => contract.reload()),
        timeoutPromise(DEFAULT_TIMEOUT_SECONDS, `Timeout fetching ${contract.symbol} contract`).then(() => contract),
      ]).catch((err: Error) => {
        logger.error(MODULE + ".findUpdatedContract", err.message, contract);
        return contract;
      });
    }
  }

  private async findUpdatedContracts(ids: (number | Contract)[]): Promise<Contract[]> {
    let result: (Contract | null)[] = [];
    while (ids.length > 0) {
      const id1 = ids.slice(0, GET_MARKET_DATA_BATCH_SIZE);
      result = result.concat(await Promise.all(id1.map(async (id) => this.findUpdatedContract(id))));
      ids = ids.slice(GET_MARKET_DATA_BATCH_SIZE);
    }
    return result;
  }

  private async findUpdatedOptions(
    underlying_id: number,
    strike: number,
    callOrPut: OptionType,
    fromTradeDate: string,
    minPremium: number,
    delta: number,
    days: number,
  ): Promise<OptionContract[]> {
    const lastTradeDate = new Date(Date.now() + days * 3_600_000 * 24).toISOString().substring(0, 10);
    const where = {
      stock_id: underlying_id,
      strike:
        callOrPut == OptionType.Call
          ? {
              [Op.gte]: strike,
            }
          : {
              [Op.lte]: strike,
            },
      lastTradeDate: { [Op.gte]: fromTradeDate, [Op.lte]: lastTradeDate },
      callOrPut,
      updatedAt: {
        [Op.lt]: new Date(Date.now() - RECENT_UPDATE / 2),
      },
    };
    const order: Order = [["strike", callOrPut == OptionType.Call ? "ASC" : "DESC"]];

    return OptionContract.findAll({
      where,
      order: [...order, ["lastTradeDate", "ASC"]],
      limit: UPDATE_OPTIONS_BATCH_FACTOR * GET_MARKET_DATA_BATCH_SIZE,
    })
      .then(async (options) => this.findUpdatedContracts(options.map((item) => item.id)))
      .then(async (_contracts) =>
        OptionContract.findAll({
          where: {
            ...where,
            delta:
              callOrPut == OptionType.Call
                ? {
                    [Op.lte]: delta,
                  }
                : {
                    [Op.gte]: delta,
                  },
            updatedAt: {
              [Op.gt]: new Date(Date.now() - RECENT_UPDATE),
            },
          },
          include: [
            {
              required: true,
              association: "contract",
              where: {
                bid: {
                  [Op.gte]: minPremium ?? this.portfolio.minPremium, // RULE : premium (bid) >= 0.25$
                },
              },
            },
            {
              required: true,
              association: "stock",
            },
          ],
          order: [["lastTradeDate", "ASC"], ...order],
          limit: 3,
          // logging: console.log,
        }),
      );
  }

  private async expireOptions(): Promise<void> {
    logger.info(MODULE + ".expireOptions", "Expiring old options contracts");
    return OptionContract.findAll({ where: { lastTradeDate: { [Op.lt]: dateToExpiration() } } }).then(async (options) =>
      options.reduce(
        async (p, option) =>
          p.then(async () => {
            const id = option.id;
            const o = await OptionStatement.findOne({
              where: {
                contract_id: id,
              },
            });
            const p = await Position.findOne({ where: { contract_id: id } });
            if (!o && !p) {
              // console.log("delete option", id);
              await option.destroy();
              await Contract.destroy({ where: { id } });
            } else {
              await option
                .set({ impliedVolatility: null, pvDividend: null, delta: null, gamma: null, vega: null, theta: null })
                .save({ omitNull: false });
            }
          }),
        Promise.resolve(),
      ),
    );
  }

  private async getPositionsValueInBase(): Promise<number> {
    return Position.findAll({ where: { portfolio_id: this.portfolio.id }, include: { association: "contract" } }).then(
      (positions) =>
        positions.reduce(
          (p, item) =>
            p +
            (item.quantity * item.contract.livePrice) /
              this.portfolio.baseRates.find((currency) => currency.currency == item.contract.currency).rate,
          0,
        ),
    );
  }

  // private async _getOptionsPositionsForUnderlying(underlying_id: number, right?: OptionType): Promise<Position[]> {
  //   return Position.findAll({
  //     where: { portfolio_id: this.portfolio.id },
  //     include: [
  //       {
  //         association: "contract",
  //         where: { secType: SecType.OPT },
  //         required: true,
  //       },
  //     ],
  //   }).then(async (positions) => {
  //     // Got all options positions
  //     return positions.reduce(
  //       async (p, position) =>
  //         p.then(async (positions) =>
  //           OptionContract.findByPk(position.contract_id).then((option) => {
  //             if (option) {
  //               if (option.stock_id == underlying_id && (right == undefined || option.callOrPut == right)) {
  //                 positions.push(position);
  //               }
  //             }
  //             return positions;
  //           }),
  //         ),
  //       Promise.resolve([] as Position[]),
  //     );
  //   });
  // }

  private async evaluatePositions(underlying_id: number): Promise<PositionsEval> {
    const result: PositionsEval = {
      [LongShort.Long]: {
        stocks: { units: 0, value: 0, engaged: 0 },
        [OptionType.Put]: { units: 0, value: 0, engaged: 0 },
        [OptionType.Call]: { units: 0, value: 0, engaged: 0 },
      },
      [LongShort.Short]: {
        stocks: { units: 0, value: 0, engaged: 0 },
        [OptionType.Put]: { units: 0, value: 0, engaged: 0 },
        [OptionType.Call]: { units: 0, value: 0, engaged: 0 },
      },
    };
    return Position.findAll({
      where: { portfolio_id: this.portfolio.id },
      include: [
        {
          association: "contract",
          required: true,
        },
      ],
    }).then(async (positions) => {
      // Got all options positions
      return positions.reduce(
        async (p, position) =>
          p.then(async (result) => {
            const ls: LongShort = position.quantity >= 0 ? LongShort.Long : LongShort.Short;
            switch (position.contract.secType) {
              case SecType.STK:
                if (position.contract_id == underlying_id) {
                  result[ls].stocks.units += Math.abs(position.quantity);
                  result[ls].stocks.value += Math.abs(position.quantity) * position.contract.livePrice;
                  result[ls].stocks.engaged += Math.abs(position.quantity) * position.averagePrice;
                }
                return result;
                break;

              case SecType.OPT:
              case SecType.FOP:
                return OptionContract.findByPk(position.contract_id)
                  .then((option) => {
                    if (option) {
                      if (option.stock_id == underlying_id) {
                        result[ls][option.callOrPut].units += Math.abs(position.quantity) * option.multiplier;
                        result[ls][option.callOrPut].value +=
                          (Math.abs(position.quantity) * option.multiplier * position.contract.livePrice) /
                          this.baseRates[position.contract.currency];
                        result[ls][option.callOrPut].engaged +=
                          (Math.abs(position.quantity) * option.multiplier * option.strike) /
                          this.baseRates[position.contract.currency];
                      }
                    }
                  })
                  .then(() => result);
                break;

              default:
                return result;
            }
          }),
        Promise.resolve(result),
      );
    });
  }

  private async evaluateOrders(underlying_id: number): Promise<OrdersEval> {
    const result: OrdersEval = {
      [OrderAction.BUY]: {
        stocks: { units: 0, value: 0, engaged: 0 },
        [OptionType.Put]: { units: 0, value: 0, engaged: 0 },
        [OptionType.Call]: { units: 0, value: 0, engaged: 0 },
      },
      [OrderAction.SELL]: {
        stocks: { units: 0, value: 0, engaged: 0 },
        [OptionType.Put]: { units: 0, value: 0, engaged: 0 },
        [OptionType.Call]: { units: 0, value: 0, engaged: 0 },
      },
    };
    return OpenOrder.findAll({
      where: { portfolioId: this.portfolio.id },
      include: [
        {
          association: "contract",
          required: true,
        },
      ],
    }).then(async (orders) => {
      // Got all options positions
      return orders.reduce(
        async (p, order) =>
          p.then(async (result) => {
            switch (order.contract.secType) {
              case SecType.STK:
                if (order.contractId == underlying_id) {
                  result[order.actionType].stocks.units += order.totalQty;
                  result[order.actionType].stocks.value +=
                    (order.totalQty * (order.lmtPrice ? order.lmtPrice : order.contract.livePrice)) /
                    this.baseRates[order.contract.currency];
                  result[order.actionType].stocks.engaged = result[order.actionType].stocks.value;
                }
                return result;
                break;

              case SecType.OPT:
              case SecType.FOP:
                return OptionContract.findByPk(order.contractId)
                  .then((option) => {
                    if (option) {
                      if (option.stock_id == underlying_id) {
                        result[order.actionType][option.callOrPut].units += order.totalQty * option.multiplier;
                        result[order.actionType][option.callOrPut].value +=
                          (order.totalQty *
                            option.multiplier *
                            (order.lmtPrice ? order.lmtPrice : order.contract.livePrice)) /
                          this.baseRates[order.contract.currency];
                        result[order.actionType][option.callOrPut].engaged +=
                          (order.totalQty * option.multiplier * option.strike) /
                          this.baseRates[order.contract.currency];
                      }
                    }
                  })
                  .then(() => result);
                break;

              default:
                return result;
            }
          }),
        Promise.resolve(result),
      );
    });
  }

  private async updateCurrencyContracts(): Promise<void> {
    logger.info(MODULE + ".updateCurrencyContracts", "Updating currencies' contracts");
    return Contract.findAll({ where: { secType: SecType.CASH } })
      .then(async (contracts) => this.findUpdatedContracts(contracts.map((item) => item.id)))
      .then((currencies) =>
        currencies.forEach((currency) => (this.baseRates[currency.symbol.substring(4)] = currency.livePrice)),
      );
  }

  private async updatePositionsContracts(): Promise<Contract[]> {
    logger.info(MODULE + ".updatePositions", "Updating positions' contracts");
    return Position.findAll({
      where: { portfolio_id: this.portfolio.id },
      include: [
        {
          association: "contract",
          required: true,
        },
      ],
    })
      .then(async (positions) => {
        const ids: number[] = [];
        for (const pos of positions) {
          ids.push(pos.contract_id);
          switch (pos.contract.secType) {
            case SecType.OPT:
              {
                const underlying_id = (await OptionContract.findByPk(pos.contract_id)).stock_id;
                if (ids.findIndex((value) => value == underlying_id) < 0) ids.push(underlying_id);
              }
              break;
          }
        }
        return ids;
      })
      .then(async (contrats) => this.findUpdatedContracts(contrats))
      .catch((error) => {
        logger.error(MODULE + ".updatePositionsContracts", error.message);
        return null as Contract[];
      });
  }

  private async updateSettingsContracts(settings: Setting[]): Promise<Setting[]> {
    logger.info(MODULE + ".updateSettingsContracts", "Updating settings' contracts");
    return this.findUpdatedContracts(settings.map((item) => item.underlying)).then(() => settings);
  }

  private async addOneOptionsChains(setting: Setting): Promise<Setting> {
    logger.info(MODULE + ".addOptionsChains", `Add or Update options' chains: ${setting.underlying.symbol}`);
    return this.api
      .getSecDefOptParams(
        setting.underlying.symbol,
        "", // exchange but only empty string returns results
        setting.underlying.secType as SecType,
        setting.underlying.conId,
      )
      .then(async (details) => {
        const detail = details.filter((item) => item.exchange == "SMART")[0];
        for (const expstr of detail.expirations) {
          const expdate = expirationToDate(expstr);
          const days = (expdate.getTime() - Date.now()) / 60_000 / 1440;
          if (days > 0 && days <= setting.lookupDays) {
            const last = await OptionContract.findOne({
              where: {
                stock_id: setting.stock_id,
                lastTradeDate: expirationToDateString(expstr),
              },
              order: [["createdAt", "DESC"]],
            });

            // update once a day or so
            if (!last || last.createdAt.getTime() < Date.now() - 24 * 3_600_000 * (1 + Math.random())) {
              // Refresh option chain
              logger.info(
                MODULE + ".addOptionsChains",
                `Refreshing ${setting.underlying.symbol}@${expstr} option chain`,
              );
              const ibContract: IbContract = {
                exchange: "SMART",
                secType: SecType.OPT,
                symbol: setting.underlying.symbol,
                currency: setting.underlying.currency,
                lastTradeDateOrContractMonth: expstr,
                strike: 0,
              };

              await Promise.race([
                this.api
                  .getContractDetails(ibContract)
                  .then(async (result) =>
                    result.reduce(
                      async (p, item) =>
                        p.then(async () => this.findOrCreateContract(item.contract).then((contract) => contract)),
                      Promise.resolve(null as unknown as Contract),
                    ),
                  )
                  .then(async () => {
                    if (last) {
                      // update this reference record so we don't rescan this option chain too early
                      last.set("createdAt", new Date(), { raw: true });
                      last.changed("createdAt", true);
                      await last.save({
                        silent: true,
                      });
                    }
                  }),
                timeoutPromise(
                  DEFAULT_TIMEOUT_SECONDS,
                  `Timeout fetching ${setting.underlying.symbol} option chain for expiration ${expstr}`,
                ),
              ]).catch((reason: Error) => logger.error(MODULE + ".addOptionsChains", reason.message));
            } else {
              logger.trace(
                MODULE + ".addOptionsChains",
                `Ignoring recent ${setting.underlying.symbol}@${expstr} option chain`,
              );
            }
          }
        }
      })
      .then(() => setting);
  }

  private async addOptionsChains(): Promise<void> {
    logger.info(MODULE + ".addOptionsChains", "Add or Update options' chains");
    return this.portfolio.settings.reduce(
      async (p, setting) => p.then(async () => this.addOneOptionsChains(setting).then()),
      Promise.resolve(),
    );
  }

  private async runOneRollStrategy(position: Position, setting: Setting): Promise<void> {
    if (setting) {
      logger.info(MODULE + ".runOneRollStrategy", `Roll strategy for ${position.contract.symbol}`);
      /** Underlying price */
      const price = await this.findUpdatedContract(setting.underlying.id).then((contract) => contract!.livePrice);
      const option = await this.findUpdatedContract(position.contract_id).then(async (contract) =>
        OptionContract.findByPk(contract.id),
      );
      if (
        price &&
        option &&
        ((option.callOrPut == OptionType.Put && price < option.strike) ||
          (option.callOrPut == OptionType.Call && price > option.strike))
      ) {
        logger.info(MODULE + ".runOneRollStrategy", `Roll strategy for ${position.contract.symbol}: ITM`);
        const days = daysToExpiration(option.lastTradeDate);
        let options: OptionContract[] = [];
        if (days < 0) logger.warn(MODULE + ".runOneRollStrategy", `${position.contract.symbol} expired`);
        else if (option.callOrPut == OptionType.Put && setting.rollPutStrategy) {
          logger.info(MODULE + ".run", `Roll Put strategy for ${setting.underlying.symbol}: Rolling`);
          // try to find OTM option first
          options = await this.findUpdatedOptions(
            setting.underlying.id,
            price,
            option!.callOrPut,
            option!.lastTradeDate,
            position.contract.ask,
            -1,
            setting.lookupDays,
          );
          this.printObject(options);
          // if not, just roll to later date
          if (!options.length) {
            options = await this.findUpdatedOptions(
              setting.underlying.id,
              option!.strike,
              option!.callOrPut,
              option!.lastTradeDate,
              position.contract.ask,
              -1,
              setting.lookupDays,
            );
            this.printObject(options);
          }
        } else if (option.callOrPut == OptionType.Call && setting.rollCallStrategy) {
          logger.info(MODULE + ".run", `Roll Call strategy for ${setting.underlying.symbol}: Rolling`);
          // try to find OTM option first
          options = await this.findUpdatedOptions(
            setting.underlying.id,
            price,
            option!.callOrPut,
            option!.lastTradeDate,
            position.contract.ask,
            1,
            setting.lookupDays,
          );
          this.printObject(options);
          if (!options.length) {
            options = await this.findUpdatedOptions(
              setting.underlying.id,
              option!.strike,
              option!.callOrPut,
              option!.lastTradeDate,
              position.contract.ask,
              1,
              setting.lookupDays,
            );
            this.printObject(options);
          }
        } else
          logger.info(
            MODULE + ".runOneRollStrategy",
            `Roll ${option.callOrPut == OptionType.Call ? "Call" : "Put"} strategy for ${position.contract.symbol}: Off`,
          );

        if (options.length > 0) {
          const option = options[0];
          this.printObject(option);
          const contract = ITradingBot.OptionComboContract(
            option.stock,
            position.contract.conId,
            option.contract.conId,
          );
          const order = ITradingBot.ComboLimitOrder(
            OrderAction.BUY,
            -position.quantity,
            -option.contract.ask + option.contract.bid,
          );
          this.printObject(contract);
          this.printObject(order);
          await this.api.placeNewOrder(contract, order).then((orderId: number) => {
            logger.info(MODULE + ".runOneRollStrategy", `${setting.underlying.symbol}: order #${orderId} placed`);
          });
        } else {
          logger.warn(MODULE + ".runOneRollStrategy", `${setting.underlying.symbol}: empty options list`);
        }
      } else {
        logger.info(MODULE + ".runOneRollStrategy", `Roll strategy for ${position.contract.symbol}: OTM`);
      }
    } else {
      logger.info(MODULE + ".runOneRollStrategy", `Roll strategy for ${position.contract.symbol}: Unmanaged`);
    }
  }

  private async runRollStrategies(): Promise<void> {
    logger.info(MODULE + ".runRollStrategies", "Running Roll strategies");
    return Position.findAll({
      where: { portfolio_id: this.portfolio.id },
      include: { association: "contract", where: { secType: SecType.OPT } },
    }).then(async (positions) =>
      positions.reduce(
        async (p, position) =>
          p.then(async () =>
            OptionContract.findByPk(position.contract_id)
              .then(async (option) =>
                Setting.findOne({
                  where: { portfolio_id: this.portfolio.id, stock_id: option.stock_id },
                  include: { association: "underlying" },
                }),
              )
              .then(async (setting) => this.runOneRollStrategy(position, setting)),
          ),
        Promise.resolve(),
      ),
    );
  }

  private async runOneCCStrategy(position: Position, setting: Setting): Promise<void> {
    if (!setting) {
      logger.info(MODULE + ".runOneCCStrategy", `Covered Calls strategy for ${position.contract.symbol}: Unmanaged`);
    } else if (setting.ccStrategy == StrategySetting.Off) {
      logger.info(MODULE + ".runOneCCStrategy", `Covered Calls strategy for ${position.contract.symbol}: Off`);
    } else {
      logger.info(MODULE + ".runOneCCStrategy", `Covered Calls strategy for ${setting.underlying.symbol}: On`);
      if (
        setting.underlying.livePrice &&
        setting.underlying.previousClosePrice &&
        // RULE : stock price is higher than previous close
        setting.underlying.livePrice > setting.underlying.previousClosePrice
      ) {
        const positions = await this.evaluatePositions(setting.underlying.id);
        const orders = await this.evaluateOrders(setting.underlying.id);
        console.log(positions);
        console.log(orders);

        const stock_positions = positions[LongShort.Long].stocks.units - positions[LongShort.Short].stocks.units;
        const stock_sell_orders = orders[OrderAction.SELL].stocks.units;

        const call_positions = positions[LongShort.Short][OptionType.Call].units;
        const call_sell_orders = orders[OrderAction.SELL][OptionType.Call].units;

        const free_for_this_symbol = stock_positions - stock_sell_orders - call_positions - call_sell_orders;
        console.log("free_for_this_symbol:", free_for_this_symbol);
        if (free_for_this_symbol > 0) {
          const strike = Math.max(setting.underlying.livePrice, position.averagePrice);
          const options = await this.findUpdatedOptions(
            setting.stock_id,
            strike,
            OptionType.Call,
            new Date().toISOString().substring(0, 10),
            setting.minPremium,
            setting.ccDelta,
            setting.lookupDays,
          );
          if (options.length > 0) {
            const option = options[0];
            this.printObject(option);
            const units = Math.floor(free_for_this_symbol / option.multiplier);
            if (units >= MIN_UNITS_TO_TRADE) {
              const contract = ITradingBot.OptionToIbContract(option);
              const order = ITradingBot.CcOrder(OrderAction.SELL, units, option.contract.livePrice);
              this.printObject(contract);
              this.printObject(order);
              await this.api.placeNewOrder(contract, order).then((orderId: number) => {
                logger.info(MODULE + ".runOneCCStrategy", `${setting.underlying.symbol}: order #${orderId} placed`);
              });
            }
          } else {
            logger.warn(MODULE + ".runOneCCStrategy", `${setting.underlying.symbol}: empty options list`);
          }
        }
      } else
        logger.info(
          MODULE + ".runOneCCStrategy",
          `Covered Calls strategy for ${setting.underlying.symbol}: stock price not up`,
        );
    }
  }

  private async runCCStrategies(): Promise<void> {
    logger.info(MODULE + ".run", "Running Covered Calls strategies");
    return Position.findAll({
      where: { portfolio_id: this.portfolio.id },
      include: { association: "contract", where: { secType: SecType.STK } },
    })
      .then(async (positions) =>
        positions.reduce(
          async (p, position) =>
            p.then(async () =>
              Setting.findOne({
                where: { portfolio_id: this.portfolio.id, stock_id: position.contract_id },
                include: { association: "underlying" },
              }).then(async (setting) => this.runOneCCStrategy(position, setting)),
            ),
          Promise.resolve(),
        ),
      )
      .catch((error) => {
        logger.error(MODULE + ".runCCStrategies", error.message);
      });
  }

  private async runOneCSPStrategy(setting: Setting): Promise<void> {
    if (setting.cspStrategy) {
      logger.info(
        MODULE + ".runOneCSPStrategy",
        `Cash Secured Puts strategy for ${setting.underlying.symbol}: ${cspStrategy2String(setting.cspStrategy)}`,
      );

      if (
        setting.underlying.livePrice &&
        setting.underlying.previousClosePrice &&
        // RULE: stock price is lower than previous close
        setting.underlying.livePrice < setting.underlying.previousClosePrice
      ) {
        const positions = await this.evaluatePositions(setting.underlying.id);
        const orders = await this.evaluateOrders(setting.underlying.id);

        const stock_positions = positions[LongShort.Long].stocks.units - positions[LongShort.Short].stocks.units;
        // const stock_sell_orders = orders[OrderAction.SELL].stocks.engaged;

        const positions_put_short_engaged = positions[LongShort.Short][OptionType.Put].engaged;
        const put_sell_orders = orders[OrderAction.SELL][OptionType.Put].engaged;

        const engaged_symbol = stock_positions + positions_put_short_engaged + put_sell_orders;

        let max_for_this_symbol = 0;
        switch (setting.cspStrategy) {
          case CspStrategySetting.Cash:
            {
              // we can use `navRatio` part of cash (balances + invested cash) for put selling, minus what has already been sold or on orders
              const benchmark_positions = await this.evaluatePositions(this.portfolio.benchmark_id);
              max_for_this_symbol =
                (benchmark_positions[LongShort.Long].stocks.value -
                  benchmark_positions[LongShort.Short].stocks.value +
                  (await this.getTotalBalanceInBase())) *
                setting.navRatio;
            }
            break;

          case CspStrategySetting.Nav:
            // we can invest in this symbol up to `navRatio` part of portfolio Nav
            max_for_this_symbol =
              ((await this.getPositionsValueInBase()) + (await this.getTotalBalanceInBase())) * setting.navRatio;
            break;
        }
        const free_for_this_symbol = max_for_this_symbol - engaged_symbol;

        if (free_for_this_symbol > 0) {
          const options = await this.findUpdatedOptions(
            setting.underlying.id,
            setting.underlying.livePrice, // RULE 2 & 5: strike < cours (OTM) & max ratio per symbol
            OptionType.Put,
            new Date().toISOString().substring(0, 10),
            setting.minPremium,
            -Math.abs(setting.cspDelta ?? this.portfolio.cspWinRatio! - 1), // RULE 3: delta <= -0.15
            setting.lookupDays,
          );
          if (options.length > 0) {
            console.log(positions);
            console.log(orders);
            console.log(
              "=> engaged:",
              "max:",
              max_for_this_symbol,
              "engaged:",
              engaged_symbol,
              "free (in base):",
              free_for_this_symbol,
              "free (in currency):",
              free_for_this_symbol * this.baseRates[setting.underlying.currency],
            );
            const option = options[0];
            this.printObject(option);
            const option_engaging = option.strike * option.multiplier;
            const units = Math.floor(free_for_this_symbol / option_engaging);
            if (units >= MIN_UNITS_TO_TRADE) {
              const contract = ITradingBot.OptionToIbContract(option);
              const order = ITradingBot.CcOrder(OrderAction.SELL, units, option.contract.ask);
              this.printObject(contract);
              this.printObject(order);
              await this.api.placeNewOrder(contract, order).then((orderId: number) => {
                logger.info(MODULE + ".runOneCSPStrategy", `${setting.underlying.symbol}: order #${orderId} placed`);
              });
            } else {
              logger.info(
                MODULE + ".runOneCSPStrategy",
                "Can't submit order, option engaging",
                option_engaging,
                "free",
                free_for_this_symbol,
              );
            }
          } else
            logger.info(
              MODULE + ".runOneCSPStrategy",
              `Cash Secured Puts strategy for ${setting.underlying.symbol}: empty option list`,
            );
        }
      } else
        logger.info(
          MODULE + ".runOneCSPStrategy",
          `Cash Secured Puts strategy for ${setting.underlying.symbol}: stock price not down`,
        );
    } else {
      logger.info(MODULE + ".runOneCSPStrategy", `Cash Secured Puts strategy for ${setting.underlying.symbol}: Off`);
    }
  }

  private async runCSPStrategies(): Promise<void> {
    logger.info(MODULE + ".runCSPStrategies", "Running Cash Secured Put strategies");
    return this.portfolio.settings
      .filter((item) => item.cspStrategy)
      .reduce(async (p, setting) => p.then(async () => this.runOneCSPStrategy(setting)), Promise.resolve());
  }

  private async runCashStrategy(): Promise<void> {
    logger.info(MODULE + ".runCashStrategy", "Running Cash strategy");
    if (!this.portfolio.cashStrategy) {
      // Off => nothing to do
    } else if (this.portfolio.cashStrategy == CashStrategy.Balance) {
      // manage cash balance
      const price = await this.findUpdatedContract(this.portfolio.benchmark_id).then((contract) => contract!.livePrice);
      await Balance.findOne({
        where: {
          portfolio_id: this.portfolio.id,
          currency: this.portfolio.benchmark.currency,
        },
      }).then(async (balance) => {
        if (price) {
          const positions = await this.evaluatePositions(this.portfolio.benchmark_id);
          const orders = await this.evaluateOrders(this.portfolio.benchmark_id);
          const benchmark_on_order = orders[OrderAction.BUY].stocks.units - orders[OrderAction.SELL].stocks.units;
          const units_to_order = Math.floor(balance!.quantity / price);
          console.log(
            "positions:",
            positions,
            "orders:",
            orders,
            "benchmark_on_order:",
            benchmark_on_order,
            "units_to_order:",
            units_to_order,
          );
          if (units_to_order == benchmark_on_order) {
            logger.info(MODULE + ".runCashStrategy", "Allset, nothing to do");
          } else if (benchmark_on_order) {
            // cancel any pending order
            await OpenOrder.findAll({
              where: {
                portfolioId: this.portfolio.id,
                contractId: this.portfolio.benchmark.id,
                orderId: { [Op.ne]: 0 },
              },
            }).then(async (orders) =>
              orders.reduce(async (p, order) => {
                return p.then(() => this.cancelOrder(order.orderId));
              }, Promise.resolve()),
            );
          } else if (units_to_order != benchmark_on_order) {
            // place an order to manage cash balance
            const contract: IbContract = {
              conId: this.portfolio.benchmark.conId,
              secType: this.portfolio.benchmark.secType as SecType,
              currency: this.portfolio.benchmark.currency,
              symbol: this.portfolio.benchmark.symbol,
              exchange: "SMART",
            };
            const order: IbOrder = {
              action: units_to_order >= 0 ? OrderAction.BUY : OrderAction.SELL,
              orderType: "MIDPRICE" as OrderType,
              totalQuantity: Math.abs(units_to_order),
              tif: TimeInForce.DAY,
              outsideRth: false,
              transmit: true,
            };
            if (units_to_order < 0 || units_to_order >= this.portfolio.minBenchmarkUnits) {
              this.info(
                units_to_order >= 0 ? "buying" : "selling",
                Math.abs(units_to_order),
                "units of",
                this.portfolio.benchmark.symbol,
              );
              this.printObject(contract);
              this.printObject(order);
              await this.placeNewOrder(contract, order).then((orderId) =>
                logger.info(MODULE + ".runCashStrategy", `orderid ${orderId} placed`),
              );
            }
          } else logger.error(MODULE + ".runCashStrategy", "Something went wrong");
        }
      });
    } else {
      throw Error(`unimplemented cash strategy ${this.portfolio.cashStrategy as number}`);
    }
  }

  private async placeOptionOrder(contract: IbContract, order: IbOrder): Promise<void> {
    try {
      const orderId = await this.api.placeNewOrder(contract, order);
      logger.info(MODULE + ".placeOptionOrder", `Order #${orderId} placed for ${contract.symbol}`);
    } catch (error) {
      logger.error(MODULE + ".placeOptionOrder", `Failed to place order for ${contract.symbol}:`, error);
      throw error;
    }
  }

  private async processBatch<T>(items: T[], batchSize: number, processor: (item: T) => Promise<void>): Promise<void> {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await Promise.all(batch.map(processor));
    }
  }

  public async run(): Promise<void> {
    logger.info(MODULE + ".run", "Trader bot running");
    if (this.portfolio) {
      await this.portfolio
        // Reload settings
        .reload()
        .then(async (_portfolio) =>
          this.portfolio.settings.reduce(
            async (p, setting) => p.then(async () => setting.reload().then()),
            Promise.resolve(),
          ),
        )
        .then(async () => this.expireOptions())
        .then(async () => this.addOptionsChains())
        .then(async () => this.updateCurrencyContracts())
        .then(async () => this.updateSettingsContracts(this.portfolio.settings))
        .then(async () => this.updatePositionsContracts())
        .then(async () => this.runRollStrategies())
        .then(async () => this.runCCStrategies())
        .then(async () => this.runCSPStrategies())
        .then(async () => this.runCashStrategy())
        .catch((error) => {
          console.error(error);
          logger.error(MODULE + ".run", error.message);
        })
        .finally(() => logger.info(MODULE + ".run", "Trader bot ran"));
    } else {
      logger.warn(MODULE + ".run", "Portfolio undefined");
    }
    this.timer = setTimeout(() => {
      this.run().catch((error: Error) => this.error(error.message));
    }, RUN_INTERVAL);
  }

  public start(): void {
    logger.info(MODULE + ".start", "Trader bot starting");
    this.init()
      .then(() => {
        this.timer = setTimeout(() => {
          this.run().catch((error: Error) => this.error(error.message));
        }, START_AFTER);
      })
      .catch((error: Error) => this.error(error.message));
  }

  public stop(): void {
    clearTimeout(this.timer);
  }
}
