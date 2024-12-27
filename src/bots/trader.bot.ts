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
          [Op.gt]: new Date(Date.now() - UPDATE_OPTIONS_BATCH_FACTOR * GET_MARKET_DATA_DURATION * 2),
        },
        delta: {
          [Op.lt]: 1 - this.portfolio.ccWinRatio!, // RULE : delta < 0.25
        },
      },
      include: [
        {
          required: true,
          model: Contract,
          as: "contract",
          where: {
            bid: {
              [Op.gte]: this.portfolio.minPremium, // RULE : premium (bid) >= 0.25$
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
    // console.log("updated options:");
    // this.printObject(options);

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
            }
          }),
        Promise.resolve(),
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

  protected async runRollStrategy(setting: Setting): Promise<Setting> {
    const price = await Contract.findByPk(setting.underlying.id).then((contract) => contract!.livePrice);
    if (price) {
      const positions = await this.getOptionsPositionsForUnderlying(setting.underlying.id);
      for (const position of positions) {
        const option = await OptionContract.findByPk(position.contract_id);
        if (option!.callOrPut == OptionType.Put && price < option!.strike) {
          console.log("ITM Put!", price);
          if (setting.rollPutStrategy) {
            this.printObject(position);
            const options = await this.fetchUpdatedOptions(
              setting.underlying.id,
              option!.strike,
              option!.callOrPut,
              option!.lastTradeDate,
            );
            this.printObject(options);
          }
        } else if (option!.callOrPut == OptionType.Call && price > option!.strike) {
          console.log("ITM Call!", price);
          if (setting.rollCallStrategy) {
            this.printObject(position);
          }
        }
      }
    }
    return setting;
  }

  protected async runCCStrategy(setting: Setting): Promise<Setting> {
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
        setting.ccStrategy > 0 &&
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
          await this.api
            .placeNewOrder(
              ITradingBot.OptionToIbContract(option),
              ITradingBot.CcOrder(
                OrderAction.SELL,
                Math.floor(free_for_this_symbol / option.multiplier),
                option.contract.ask!,
              ),
            )
            .then((orderId: number) => {
              console.log("orderid:", orderId.toString());
            });
        } else {
          this.error("options list empty");
        }
      } else {
        console.log("no applicable parameters or current price not higher than previous close price");
      }
    }

    return setting;
  }

  protected runCSPStrategy(setting: Setting): Setting {
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
      throw Error(`unimplemented cash strategy ${this.portfolio.cashStrategy}`);
    }
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
          if (days > 0 && days < (setting.lookupDays || 40)) {
            // lookup to 40 days
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

  protected async updatePositions(): Promise<void> {
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

  public async run(): Promise<void> {
    logger.info(MODULE + ".run", "Trader bot running");
    if (this.portfolio) {
      await this.expireOptions()
        .then(async () => this.updatePositions())
        .then(async () =>
          this.portfolio.settings
            .sort((a, b) => b.navRatio - a.navRatio)
            .reduce(
              async (p, setting) =>
                p.then(async () => {
                  logger.info(MODULE + ".run", `Running ${setting.underlying.symbol} strategies`);
                  return (
                    this.findUpdatedContract(setting.underlying.id)
                      .then((_contract) => setting)
                      .then(async (setting) => this.addOptionsChains(setting))
                      // Cash secured puts strategy
                      .then((setting) => this.runCSPStrategy(setting))
                      // Roll strategy
                      .then(async (setting) => this.runRollStrategy(setting))
                      // Covered calls strategy
                      .then(async (setting) => this.runCCStrategy(setting))
                      .then()
                  );
                }),
              Promise.resolve(),
            ),
        )
        .then(async () => this.runCashStrategy())
        .then(async () => this.updatePositions())
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
