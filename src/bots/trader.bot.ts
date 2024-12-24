import {
  Contract as IbContract,
  Order as IbOrder,
  OptionType,
  OrderAction,
  OrderType,
  SecType,
  TimeInForce,
} from "@stoqey/ib";
import { Op } from "sequelize";
import { ITradingBot } from ".";
import logger from "../logger";
import { Balance, Contract, OpenOrder, OptionContract, OptionStatement, Position, Setting } from "../models";
import { dateToExpiration, expirationToDate, expirationToDateString } from "../models/date_utils";
import { CashStrategy } from "../models/portfolio.types";

const MODULE = "TradeBot";

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unused-vars
const sequelize_logging = (...args: any[]): void => logger.trace(MODULE + ".squelize", ...args);

const timeoutPromise = async (delay: number, reason?: string): Promise<void> =>
  new Promise(
    (_, reject) => setTimeout(() => reject(new Error(reason ?? "timeout")), delay * 1_000), // Fail after some time
  );

export class TradeBot extends ITradingBot {
  timer: NodeJS.Timeout;

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

  protected async runRollStrategy(setting: Setting): Promise<Setting> {
    if (setting.rollPutStrategy || setting.rollCallStrategy) {
      const price = await Contract.findByPk(setting.underlying.id).then((contract) => contract!.livePrice);
      const positions = await Position.findAll({
        where: { portfolio_id: this.portfolio.id },
        include: [
          {
            association: "contract",
            where: { secType: SecType.OPT },
            required: true,
          },
        ],
      });
      if (setting.rollPutStrategy) {
        await positions.reduce(
          async (p, position) =>
            p.then(async () =>
              OptionContract.findByPk(position.contract_id).then((option) => {
                if (
                  option!.stock_id == setting.underlying.id &&
                  option!.callOrPut == OptionType.Put &&
                  price < option!.strike
                )
                  console.log("ITM!", price, option);
              }),
            ),
          Promise.resolve(),
        );
      }
      if (setting.rollCallStrategy) {
        await positions.reduce(
          async (p, position) =>
            p.then(async () =>
              OptionContract.findByPk(position.contract_id).then((option) => {
                if (
                  option!.stock_id == setting.underlying.id &&
                  option!.callOrPut == OptionType.Call &&
                  price > option!.strike
                )
                  console.log("ITM!", price, option);
              }),
            ),
          Promise.resolve(),
        );
      }
    }
    return setting;
  }

  protected async runCashStrategy(): Promise<void> {
    if (!this.portfolio.cashStrategy) {
      // Off => nothing to do
    } else if (this.portfolio.cashStrategy == CashStrategy.Balance) {
      // manage cash balance
      const price = await this.api
        .getMarketDataSnapshot(this.portfolio.benchmark as IbContract, "", false)
        .then(async (marketData) => this.updateContratPrice(this.portfolio.benchmark, marketData));
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

  protected runCCStrategy(setting: Setting): Setting {
    logger.error(MODULE + ".runCCStrategy", "Method not implemented.");
    return setting;
  }

  protected runCSPStrategy(setting: Setting): Setting {
    logger.error(MODULE + ".runCSPStrategy", "Method not implemented.");
    return setting;
  }

  protected async updateUnderlyingPrice(setting: Setting): Promise<Setting> {
    return this.api
      .getMarketDataSnapshot(setting.underlying as IbContract, "", false)
      .then(async (marketData) => this.updateContratPrice(setting.underlying, marketData))
      .then(() => setting);
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
                  30,
                  `timeout fetching ${setting.underlying.symbol} option chain for expiration ${expstr}`,
                ),
              ]).catch((reason: Error) => logger.error(MODULE + ".addOptionsChains", reason.message));
            } else {
              logger.info(
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
    }).then(async (positions) =>
      positions.reduce(
        async (p, position) =>
          p.then(async () =>
            this.api
              .getMarketDataSnapshot(position.contract as IbContract, "", false)
              .then(async (marketData) => this.updateContratPrice(position.contract, marketData))
              .then(() => undefined as void)
              .catch((err: Error) => logger.error(MODULE + ".updatePositions", err.message)),
          ),
        Promise.resolve(),
      ),
    );
  }

  public async run(): Promise<void> {
    logger.info(MODULE + ".run", "Trader bot running");
    if (this.portfolio) {
      await this.expireOptions()
        .then(async () =>
          this.portfolio.settings
            .sort((a, b) => b.navRatio - a.navRatio)
            .reduce(
              async (p, setting) =>
                p.then(async () => {
                  logger.info(MODULE + ".run", `Running ${setting.underlying.symbol} strategies`);
                  return (
                    this.updateUnderlyingPrice(setting)
                      .then(async (setting) => this.addOptionsChains(setting))
                      // Cash secured puts strategy
                      .then((setting) => this.runCSPStrategy(setting))
                      // Roll strategy
                      .then(async (setting) => this.runRollStrategy(setting))
                      // Covered calls strategy
                      .then((setting) => this.runCCStrategy(setting))
                      .then(() => undefined as void)
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
        }, 20_000);
      })
      .catch((error: Error) => this.error(error.message));
  }

  public stop(): void {
    clearTimeout(this.timer);
  }
}
