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
import { ITradingBot } from ".";
import logger from "../logger";
import { Balance, Contract, OpenOrder, OptionContract, OptionStatement, Position, Setting } from "../models";
import { dateToExpiration, expirationToDate, expirationToDateString } from "../models/date_utils";
import { CashStrategy } from "../models/types";

const MODULE = "TradeBot";

const GET_MARKET_DATA_BATCH_SIZE = 90;
const GET_MARKET_DATA_DURATION = 15 * 1_000; // IB says 11 but we add a bit overhead for db update
const UPDATE_OPTIONS_BATCH_FACTOR = 3;
const START_AFTER = 15 * 1_000;

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unused-vars
const sequelize_logging = (...args: any[]): void => logger.trace(MODULE + ".squelize", ...args);

const timeoutPromise = async (delay: number, reason?: string): Promise<void> =>
  new Promise(
    (_, reject) => setTimeout(() => reject(new Error(reason ?? "timeout")), delay * 1_000), // Fail after some time
  );

interface OptionEx extends OptionContract {
  yield?: number;
}

export class TradeBot extends ITradingBot {
  timer: NodeJS.Timeout;

  protected async findUpdatedContract(id: number): Promise<Contract | null> {
    const contract = await Contract.findByPk(id);
    if (!contract) {
      return null;
    } else if (Date.now() - contract.updatedAt.getTime() < 60_000) {
      // we have a recent contract
      return contract;
    } else {
      return this.api
        .getMarketDataSnapshot(contract as IbContract, "", false)
        .then(async (marketData) => this.updateContratPrice(contract, marketData))
        .catch((err: Error) => {
          logger.error(MODULE + ".findUpdatedContract", err.message);
        })
        .then(() => contract);
    }
  }

  protected async findUpdatedContracts(ids: number[]): Promise<(Contract | null)[]> {
    let result: (Contract | null)[] = [];
    while (ids.length > 0) {
      const id1 = ids.slice(0, GET_MARKET_DATA_BATCH_SIZE);
      result = result.concat(await Promise.all(id1.map(async (id) => this.findUpdatedContract(id))));
      ids = ids.slice(GET_MARKET_DATA_BATCH_SIZE);
    }
    return result;
  }

  protected async fetchUpdatedOptions(
    underlying_id: number,
    strike: number,
    callOrPut: OptionType,
    lastTradeDate: string,
    minPremium: number,
    delta: number,
  ): Promise<OptionContract[]> {
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
      lastTradeDate: { [Op.gt]: lastTradeDate },
      callOrPut,
      updatedAt: {
        [Op.lt]: new Date(Date.now() - UPDATE_OPTIONS_BATCH_FACTOR * GET_MARKET_DATA_DURATION),
      },
    };
    const order: Order = [["strike", callOrPut == OptionType.Call ? "ASC" : "DESC"]];

    let options = await OptionContract.findAll({
      where,
      order: [...order, ["lastTradeDate", "ASC"]],
      limit: UPDATE_OPTIONS_BATCH_FACTOR * GET_MARKET_DATA_BATCH_SIZE,
    });
    // console.log("initial options:");
    // this.printObject(options);

    /* const contracts = */ await this.findUpdatedContracts(options.map((item) => item.id));
    // console.log("contracts:", contracts);

    options = await OptionContract.findAll({
      where: {
        ...where,
        updatedAt: {
          [Op.gt]: new Date(Date.now() - UPDATE_OPTIONS_BATCH_FACTOR * GET_MARKET_DATA_DURATION * 3),
        },
        delta: {
          [Op.lt]: delta || 1 - this.portfolio.ccWinRatio!, // RULE : delta < 0.25
        },
      },
      include: [
        {
          required: true,
          model: Contract,
          as: "contract",
          where: {
            bid: {
              [Op.gte]: minPremium, // RULE : premium (bid) >= 0.25$
            },
          },
        },
        {
          required: true,
          model: Contract,
          as: "stock",
        },
      ],
      order: [["lastTradeDate", "ASC"], ...order],
      limit: 3,
      // logging: console.log,
    });
    console.log("updated options:");
    this.printObject(options);

    return options;
  }

  async expireOptions(): Promise<void> {
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
                .save();
            }
          }),
        Promise.resolve(),
      ),
    );
  }

  protected async getPositionsValueInBase(): Promise<number> {
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

  protected async getOptionsPositionsForUnderlying(underlying_id: number): Promise<Position[]> {
    return Position.findAll({
      where: { portfolio_id: this.portfolio.id },
      include: [
        {
          association: "contract",
          where: { secType: SecType.OPT },
          required: true,
        },
      ],
    }).then(async (positions) => {
      // Got all options positions
      return positions.reduce(
        async (p, position) =>
          p.then(async (positions) =>
            OptionContract.findByPk(position.contract_id).then((option) => {
              if (option?.stock_id == underlying_id) {
                positions.push(position);
              }
              return positions;
            }),
          ),
        Promise.resolve([] as Position[]),
      );
    });
  }

  protected async updateCurrencyContracts(): Promise<void> {
    logger.info(MODULE + ".updateCurrencyContracts", "Updating currencies' contracts");
    return Contract.findAll({ where: { secType: SecType.CASH } }).then(async (contracts) =>
      this.findUpdatedContracts(contracts.map((item) => item.id)).then(),
    );
  }

  protected async updatePositionsContracts(): Promise<void> {
    logger.info(MODULE + ".updatePositions", "Updating positions' contracts");
    return Position.findAll({
      where: { portfolio_id: this.portfolio.id },
      include: [
        {
          association: "contract",
          required: true,
        },
      ],
    }).then(async (positions) => this.findUpdatedContracts(positions.map((item) => item.contract_id)).then());
  }

  protected async addOptionsChains(setting: Setting): Promise<Setting> {
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
          const days = (expdate.getTime() - Date.now()) / 60000 / 1440;
          if (days > 0 && days <= setting.lookupDays) {
            const last = await OptionContract.findOne({
              where: {
                stock_id: setting.stock_id,
                lastTradeDate: expirationToDateString(expstr),
              },
              order: [["createdAt", "DESC"]],
            });

            // update once a day or so
            if (!last || last.createdAt.getTime() < Date.now() - 24 * 3_600_000 * (0.5 + Math.random())) {
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
                  30,
                  `timeout fetching ${setting.underlying.symbol} option chain for expiration ${expstr}`,
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

  protected async runRollStrategy(setting: Setting): Promise<Setting> {
    const price = await Contract.findByPk(setting.underlying.id).then((contract) => contract!.livePrice);
    if (price) {
      const positions = await this.getOptionsPositionsForUnderlying(setting.underlying.id);
      for (const position of positions) {
        const option = await OptionContract.findByPk(position.contract_id);
        if (option!.callOrPut == OptionType.Put && price < option!.strike) {
          if (setting.rollPutStrategy) {
            logger.info(MODULE + ".run", `Running ${setting.underlying.symbol} Roll Put strategy`);
            this.printObject(position);
            const options = await this.fetchUpdatedOptions(
              setting.underlying.id,
              option!.strike,
              option!.callOrPut,
              option!.lastTradeDate,
              0,
              1 - this.portfolio.ccWinRatio!,
            );
            this.printObject(options);
          }
        } else if (option!.callOrPut == OptionType.Call && price > option!.strike) {
          if (setting.rollCallStrategy) {
            logger.info(MODULE + ".run", `Running ${setting.underlying.symbol} Roll Call strategy`);
            this.printObject(position);
          }
        }
      }
    }
    return setting;
  }

  protected async runCCStrategy(setting: Setting): Promise<Setting> {
    if (setting.ccStrategy) {
      logger.info(MODULE + ".run", `Running ${setting.underlying.symbol} Covered Calls strategy`);
      const position = await Position.findOne({ where: { contract_id: setting.stock_id } });
      const stock_positions = position?.quantity || 0;
      console.log("stock_positions:", stock_positions);
      const stock_sell_orders = -(await this.getContractOrdersQuantity(setting.underlying, OrderAction.SELL));
      console.log("stock_sell_orders:", stock_sell_orders);
      const call_positions = await this.getOptionsPositionsQuantity(setting.underlying, "C" as OptionType);
      console.log("call_positions:", call_positions);
      const call_sell_orders = -(await this.getOptionsOrdersQuantity(
        setting.underlying,
        "C" as OptionType,
        OrderAction.SELL,
      ));
      console.log("call_sell_orders:", call_sell_orders);
      const free_for_this_symbol = stock_positions + call_positions + stock_sell_orders + call_sell_orders;
      console.log("free_for_this_symbol:", free_for_this_symbol);
      if (position && free_for_this_symbol > 0) {
        console.log("prices", setting.underlying.livePrice, setting.underlying.previousClosePrice);
        if (
          setting.underlying.livePrice &&
          setting.underlying.previousClosePrice &&
          // RULE : stock price is higher than previous close
          setting.underlying.livePrice > setting.underlying.previousClosePrice
        ) {
          // RULE defensive : strike > cours (OTM) & strike > position avg price
          // RULE agressive : strike > cours (OTM)
          const strike =
            setting.ccStrategy == 1
              ? Math.max(setting.underlying.livePrice, position.averagePrice)
              : setting.underlying.livePrice;
          const options = await this.fetchUpdatedOptions(
            setting.underlying.id,
            strike,
            OptionType.Call,
            new Date().toISOString().substring(0, 10),
            setting.minPremium,
            setting.ccDelta,
          );
          if (options.length > 0) {
            for (const option of options) {
              // const expiry: Date = new Date(option.lastTradeDate);
              const diffDays = Math.ceil((option.expiryDate.getTime() - Date.now()) / (1000 * 3600 * 24));
              option["yield"] = (option.contract.bid! / option.strike / diffDays) * 360;
              // option.stock.contract = await Contract.findByPk(option.stock.id);
            }

            options.sort((a: OptionEx, b: OptionEx) => b.yield! - a.yield!);
            // for (const option of options) {
            //     console.log("yield of contract", option["yield"]);
            //     this.printObject(option);
            // }
            const option = options[0];
            this.printObject(option);
            const units = Math.floor(free_for_this_symbol / option.multiplier);
            if (units > 0) {
              await this.api
                .placeNewOrder(
                  ITradingBot.OptionToIbContract(option),
                  ITradingBot.CcOrder(OrderAction.SELL, units, option.contract.ask!),
                )
                .then((orderId: number) => {
                  console.log("orderid:", orderId.toString());
                });
            }
          } else {
            this.error("options list empty");
          }
        } else {
          console.log(
            `Current price ${setting.underlying.livePrice} ${setting.underlying.symbol} not higher than previous close price ${setting.underlying.previousClosePrice}`,
          );
        }
      }
    }
    return setting;
  }

  protected async runCSPStrategy(setting: Setting): Promise<Setting> {
    logger.info(MODULE + ".run", `Running ${setting.underlying.symbol} Cash Secured Puts strategy`);

    console.log("processing parameter:", setting.underlying.symbol);

    const stock_positions = await this.getContractPositionValueInBase(setting.underlying);
    const stock_orders = await this.getContractOrderValueInBase(setting.underlying);
    const call_positions = await this.getOptionsPositionsSynthesisInBase(
      setting.underlying.id,
      OptionType.Call,
      true,
    ).then((r) => r.value);
    const call_sell_orders = 0; // not relevant

    const put_positions = await this.getOptionsPositionsSynthesisInBase(setting.underlying.id, OptionType.Put).then(
      (r) => r.engaged,
    );
    const put_sell_orders = await this.getOptionsOrdersEngagedInBase(
      setting.underlying.id,
      OptionType.Put,
      OrderAction.SELL,
    );

    const engaged_options = -(put_positions + put_sell_orders);
    const engaged_symbol = stock_positions + stock_orders + call_positions + call_sell_orders + engaged_options;

    if (stock_positions) console.log("stock_positions_amount in base:", Math.round(stock_positions));
    if (stock_orders) console.log("stock_orders amount in base:", Math.round(stock_orders));
    if (call_positions) console.log("call_positions value in base:", Math.round(call_positions));
    if (call_sell_orders) console.log("call_sell_orders risk in base:", Math.round(call_sell_orders));
    if (put_positions) console.log("put_positions engaged in base:", Math.round(put_positions));
    if (put_sell_orders) console.log("put_sell_orders engaged in base:", Math.round(put_sell_orders));
    console.log("=> engaged:", Math.round(engaged_symbol), Math.round(engaged_options));

    const max_for_this_symbol =
      ((await this.getPositionsValueInBase()) + (await this.getTotalBalanceInBase())) * setting.navRatio;
    console.log("max for this symbol:", Math.round(max_for_this_symbol));
    const free_for_this_symbol = max_for_this_symbol - engaged_symbol;
    console.log("free_for_this_symbol in base:", Math.round(free_for_this_symbol));
    console.log("parameter.underlying.price:", setting.underlying.livePrice);
    console.log(
      "free_for_this_symbol in currency:",
      Math.round(free_for_this_symbol * this.base_rates[setting.underlying.currency]),
    );
    // RULE 7: stock price is lower than previous close
    const _options =
      setting.underlying.livePrice > setting.underlying.previousClosePrice!
        ? []
        : await OptionContract.findAll({
            where: {
              stock_id: setting.underlying.id,
              strike: {
                [Op.lt]: Math.min(setting.underlying.livePrice, free_for_this_symbol / 100), // RULE 2 & 5: strike < cours (OTM) & max ratio per symbol
              },
              lastTradeDate: { [Op.gt]: new Date() },
              callOrPut: OptionType.Put,
              delta: {
                [Op.gt]: this.portfolio.cspWinRatio! - 1, // RULE 3: delta >= -0.2
              },
            },
            include: [
              {
                required: true,
                model: Contract,
                as: "contract",
                where: {
                  bid: {
                    [Op.gte]: this.portfolio.minPremium, // RULE 4: premium (bid) >= 0.25$
                  },
                },
              },
              {
                required: true,
                model: Contract,
                as: "stock",
              },
            ],
            // logging: console.log,
          });
    return setting;
  }

  protected async runCashStrategy(): Promise<void> {
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
          const units_to_order = Math.floor(balance!.quantity / price);
          const benchmark_on_order =
            (await this.getContractOrdersQuantity(this.portfolio.benchmark, OrderAction.BUY)) +
            (await this.getOptionsOrdersQuantity(this.portfolio.benchmark, OptionType.Put, OrderAction.SELL)) -
            (await this.getContractOrdersQuantity(this.portfolio.benchmark, OrderAction.SELL));
          // console.log(
          //   `strategy ${this.portfolio.cashStrategy} to order ${units_to_order} on order ${benchmark_on_order}`,
          // );
          if (units_to_order != benchmark_on_order) {
            // cancel any pending order
            await OpenOrder.findAll({
              where: {
                portfolio_id: this.portfolio.id,
                contract_id: this.portfolio.benchmark.id,
                orderId: { [Op.ne]: 0 },
              },
            })
              .then(async (orders) =>
                orders.reduce(async (p, order) => {
                  return p.then(() => this.cancelOrder(order.orderId));
                }, Promise.resolve()),
              )
              .then(async () => {
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
                if (order.totalQuantity) {
                  this.info(
                    units_to_order >= 0 ? "buying" : "selling",
                    Math.abs(units_to_order),
                    "units of",
                    this.portfolio.benchmark.symbol,
                  );
                  // this.printObject(contract);
                  // this.printObject(order);
                  const orderId = await this.placeNewOrder(contract, order);
                  this.info("orderid", orderId, "placed");
                }
              });
          }
        }
      });
    } else {
      throw Error(`unimplemented cash strategy ${this.portfolio.cashStrategy as number}`);
    }
  }

  public async run(): Promise<void> {
    logger.info(MODULE + ".run", "Trader bot running");
    if (this.portfolio) {
      await this.portfolio
        .reload()
        .then(async (_portfolio) => this.expireOptions())
        .then(async () => this.updateCurrencyContracts())
        .then(async () => this.updatePositionsContracts())
        .then(async () =>
          this.portfolio.settings
            .sort((a, b) => b.navRatio - a.navRatio)
            .reduce(
              async (p, setting) =>
                p.then(async () => {
                  logger.info(MODULE + ".run", `Running ${setting.underlying.symbol} strategies`);
                  return (
                    this.findUpdatedContract(setting.underlying.id)
                      .then(async (_contract) => setting.underlying.reload().then((_contract) => setting))
                      .then(async (setting) => this.addOptionsChains(setting))
                      // Roll strategy
                      .then(async (setting) => this.runRollStrategy(setting))
                      // Cash secured puts strategy
                      .then(async (setting) => this.runCSPStrategy(setting))
                      // Covered calls strategy
                      .then(async (setting) => this.runCCStrategy(setting))
                      .then()
                  );
                }),
              Promise.resolve(),
            ),
        )
        .then(async () => this.runCashStrategy())
        .then(() => logger.info(MODULE + ".run", "Trader bot ran"));
    } else {
      logger.warn(MODULE + ".run", "Portfolio undefined");
    }
    this.timer = setTimeout(() => {
      this.run().catch((error: Error) => this.error(error.message));
    }, 600_000);
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
