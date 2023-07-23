import {
  Bar,
  BarSizeSetting,
  IBApiNext,
  IBApiNextError,
  Contract as IbContract,
  OptionType,
  SecType,
  TickType,
} from "@stoqey/ib";
import { IBApiNextTickType, SecurityDefinitionOptionParameterType } from "@stoqey/ib/dist/api-next";
import { TickType as IBApiTickType } from "@stoqey/ib/dist/api/market/tickType";
import { MutableMarketData } from "@stoqey/ib/dist/core/api-next/api/market/mutable-market-data";
import { Op, QueryTypes } from "sequelize";
import { ITradingBot, YahooUpdateBot } from ".";
import { MyTradingBotApp } from "..";
import logger from "../logger";
import { AnyContract, Contract, Currency, Option, Position, Stock } from "../models";

const MODULE = "UpdaterBot";

const HISTORICAL_DATA_REFRESH_FREQ: number = parseInt(process.env.HISTORICAL_DATA_REFRESH_FREQ as string) || 12 * 60;
const STOCKS_PRICES_REFRESH_FREQ: number = parseInt(process.env.STOCKS_PRICES_REFRESH_FREQ as string) || 15; // mins
const FX_RATES_REFRESH_FREQ: number = parseInt(process.env.FX_RATES_REFRESH_FREQ as string) || 60; // mins
const OPTIONS_LIST_BUILD_FREQ: number = parseInt(process.env.OPTIONS_LIST_BUILD_FREQ as string) || 24; // hours
const BATCH_SIZE_OPTIONS_PRICE: number = parseInt(process.env.BATCH_SIZE_OPTIONS_PRICE as string) || 95; // units
const OPTIONS_PRICE_DTE_FREQ: number = parseInt(process.env.OPTIONS_PRICE_DTE_FREQ as string) || 15; // mins
const OPTIONS_PRICE_WEEK_FREQ: number = parseInt(process.env.OPTIONS_PRICE_WEEK_FREQ as string) || 60; // mins
const OPTIONS_PRICE_MONTH_FREQ: number = parseInt(process.env.OPTIONS_PRICE_MONTH_FREQ as string) || 90; // mins
const OPTIONS_PRICE_OTHER_FREQ: number = parseInt(process.env.OPTIONS_PRICE_OTHER_FREQ as string) || 120; // mins
const OPTIONS_PRICE_TIMEFRAME: number = parseInt(process.env.OPTIONS_PRICE_TIMEFRAME as string) || 130; // days

export class ContractsUpdaterBot extends ITradingBot {
  private yahooBot: YahooUpdateBot | undefined = undefined;

  constructor(app: MyTradingBotApp, api: IBApiNext, accountNumber: string, yahooBot?: YahooUpdateBot) {
    super(app, api, accountNumber);
    this.yahooBot = yahooBot;
  }

  public updateOptionsPriceWrapper(): void {
    this.updateOptionsPrice().catch((error) => console.error(error));
  }
  public start(): void {
    this.on("updateHistoricalData", () => this.updateHistoricalData());
    this.on("updateOptionsPrice", () => this.updateOptionsPriceWrapper());
    this.on("buildOptionsList", () => this.buildOptionsList());
    this.on("createCashContracts", () => this.createCashContracts());

    setTimeout(() => this.emit("updateHistoricalData"), 10 * 60 * 1000); // start after 10 mins
    setTimeout(() => this.emit("updateOptionsPrice"), 20 * 1000); // start after 20 secs
    setTimeout(() => this.emit("createCashContracts"), 10 * 1000); // start after 10 secs
    // setTimeout(() => this.emit("buildOptionsList"), 3600 * 1000);    // start after 1 hour
  }

  private updateHistoricalVolatility(id: number, bars: Bar[]): Promise<void> {
    const histVol: number = bars[bars.length - 1].close!;
    // console.log(`updateHistoricalVolatility got ${histVol} for contract id ${id}`)
    return Stock.update(
      {
        historicalVolatility: histVol,
      },
      {
        where: {
          id: id,
        },
      },
    ).then();
  }

  private requestHistoricalVolatility(contract: Contract): Promise<Bar[]> {
    // console.log(`requestHistoricalVolatility for contract ${contract.symbol}`)
    return this.api
      .getHistoricalData(
        {
          conId: contract.conId ?? undefined,
          symbol: contract.symbol,
          secType: contract.secType as SecType,
          exchange: "SMART",
          currency: contract.currency,
        },
        "",
        "2 D",
        BarSizeSetting.DAYS_ONE,
        "HISTORICAL_VOLATILITY",
        0,
        1,
      )
      .catch((err: IBApiNextError) => {
        console.log(`getHistoricalData failed with '${err.error.message}'`);
        throw err.error;
      });
  }

  private iterateContractsForHistoricalVolatility(contracts: Contract[]): Promise<void> {
    return contracts.reduce((p, contract) => {
      return p.then(() =>
        this.requestHistoricalVolatility(contract)
          .then((bars) => this.updateHistoricalVolatility(contract.id, bars))
          .catch(() => {
            // this.app.error(`getHistoricalData failed with '${err.error.message}'`);
          }),
      );
    }, Promise.resolve()); // initial
  }

  private findStocksNeedingHistoricalData(): Promise<Contract[]> {
    // stock.historical_volatility is not needed below be we like to eventually display it in debug logs
    return this.app.sequelize.query(
      `
      SELECT
          DISTINCT(contract.symbol),
          stock.historical_volatility,
          contract.*
        FROM trading_parameters, contract, stock
        WHERE trading_parameters.stock_id = contract.id
          AND trading_parameters.stock_id = stock.id
        GROUP BY contract.symbol
        ORDER BY contract.updatedAt
        `,
      {
        model: Contract,
        mapToModel: true, // pass true here if you have any mapped fields
        // logging: console.log,
      },
    );
  }

  private updateHistoricalData(): void {
    console.log("updateHistoricalData");
    this.findStocksNeedingHistoricalData()
      .then((contracts) => this.iterateContractsForHistoricalVolatility(contracts))
      .then(() => setTimeout(() => this.emit("updateHistoricalData"), HISTORICAL_DATA_REFRESH_FREQ * 60000))
      .catch((error) => console.error("updater bot update historical data:", error));
  }

  private requestContractPrice(ibContract: IbContract): Promise<MutableMarketData> {
    return this.api.getMarketDataSnapshot(ibContract, "", false);
  }

  private updateContratPrice(contract: Contract, marketData: MutableMarketData): Promise<number | undefined | null> {
    // console.log(`updateContratPrice got data for ${contract.secType} contract ${contract.symbol} id ${contract.id}`);
    // this.app.printObject(marketData);
    const dataset: {
      bid?: number | null;
      ask?: number | null;
      price?: number | null;
      previousClosePrice?: number | null;
    } = {};
    const optdataset: {
      pvDividend?: number | null;
      delta?: number | null;
      gamma?: number | null;
      impliedVolatility?: number | null;
      vega?: number | null;
      theta?: number | null;
    } = {};
    marketData.forEach((tick, type: TickType) => {
      if (type == IBApiTickType.BID) {
        dataset.bid = (tick.value as number) > 0 ? tick.value : null;
      } else if (type == IBApiTickType.ASK) {
        dataset.ask = (tick.value as number) > 0 ? tick.value : null;
      } else if (type == IBApiTickType.LAST) {
        dataset.price = (tick.value as number) > 0 ? tick.value : null;
      } else if (type == IBApiTickType.CLOSE) {
        dataset.previousClosePrice = (tick.value as number) > 0 ? tick.value : null;
      } else if (
        [
          IBApiTickType.BID_SIZE,
          IBApiTickType.ASK_SIZE,
          IBApiTickType.LAST_SIZE,
          IBApiTickType.OPEN,
          IBApiTickType.HIGH,
          IBApiTickType.LOW,
          IBApiTickType.VOLUME,
          IBApiTickType.HALTED,
        ].includes(type as IBApiTickType)
      ) {
        // siliently ignore
        // console.log('silently ignored', type, tick);
      } else if (type == IBApiNextTickType.OPTION_PV_DIVIDEND) {
        optdataset.pvDividend = tick.value;
      } else if (type == IBApiNextTickType.LAST_OPTION_PRICE) {
        if (!dataset.price) {
          dataset.price = (tick.value as number) > 0 ? tick.value : null;
        }
      } else if (type == IBApiNextTickType.LAST_OPTION_DELTA) {
        if (tick.value) {
          optdataset.delta = tick.value;
        }
        // console.log("delta (last):", optdataset.delta, tick.value);
      } else if (type == IBApiNextTickType.LAST_OPTION_GAMMA) {
        if (tick.value) {
          optdataset.gamma = tick.value;
        }
      } else if (type == IBApiNextTickType.LAST_OPTION_VEGA) {
        if (tick.value) {
          optdataset.vega = tick.value;
        }
      } else if (type == IBApiNextTickType.LAST_OPTION_THETA) {
        if (tick.value) {
          optdataset.theta = tick.value;
        }
      } else if (type == IBApiNextTickType.LAST_OPTION_IV) {
        if (tick.value) {
          optdataset.impliedVolatility = tick.value;
        }
      } else if (type == IBApiNextTickType.MODEL_OPTION_PRICE) {
        if (!dataset.price && (tick.value as number) > 0) {
          dataset.price = tick.value;
        }
      } else if (type == IBApiNextTickType.MODEL_OPTION_IV) {
        if (!optdataset.impliedVolatility && (tick.value as number) > 0) {
          optdataset.impliedVolatility = tick.value;
        }
      } else if (type == IBApiNextTickType.MODEL_OPTION_DELTA) {
        if (!optdataset.delta && tick.value) {
          optdataset.delta = tick.value;
        }
        // console.log("delta (model):", optdataset.delta, tick.value);
      } else if (type == IBApiNextTickType.MODEL_OPTION_GAMMA) {
        if (!optdataset.gamma && tick.value) {
          optdataset.gamma = tick.value;
        }
      } else if (type == IBApiNextTickType.MODEL_OPTION_VEGA) {
        if (!optdataset.vega && tick.value) {
          optdataset.vega = tick.value;
        }
      } else if (type == IBApiNextTickType.MODEL_OPTION_THETA) {
        if (!optdataset.theta && tick.value) {
          optdataset.theta = tick.value;
        }
      } else if (
        [
          IBApiNextTickType.OPTION_UNDERLYING,
          // would be interesting to use OPTION_UNDERLYING to update underlying
          IBApiNextTickType.BID_OPTION_IV,
          IBApiNextTickType.BID_OPTION_PRICE,
          IBApiNextTickType.BID_OPTION_DELTA,
          IBApiNextTickType.BID_OPTION_GAMMA,
          IBApiNextTickType.BID_OPTION_VEGA,
          IBApiNextTickType.BID_OPTION_THETA,
          IBApiNextTickType.DELAYED_BID_OPTION_IV,
          IBApiNextTickType.DELAYED_BID_OPTION_PRICE,
          IBApiNextTickType.DELAYED_BID_OPTION_DELTA,
          IBApiNextTickType.DELAYED_BID_OPTION_GAMMA,
          IBApiNextTickType.DELAYED_BID_OPTION_VEGA,
          IBApiNextTickType.DELAYED_BID_OPTION_THETA,
          IBApiNextTickType.ASK_OPTION_IV,
          IBApiNextTickType.ASK_OPTION_PRICE,
          IBApiNextTickType.ASK_OPTION_DELTA,
          IBApiNextTickType.ASK_OPTION_GAMMA,
          IBApiNextTickType.ASK_OPTION_VEGA,
          IBApiNextTickType.ASK_OPTION_THETA,
          IBApiNextTickType.DELAYED_ASK_OPTION_IV,
          IBApiNextTickType.DELAYED_ASK_OPTION_PRICE,
          IBApiNextTickType.DELAYED_ASK_OPTION_DELTA,
          IBApiNextTickType.DELAYED_ASK_OPTION_GAMMA,
          IBApiNextTickType.DELAYED_ASK_OPTION_VEGA,
          IBApiNextTickType.DELAYED_ASK_OPTION_THETA,
          IBApiNextTickType.DELAYED_LAST_OPTION_IV,
          IBApiNextTickType.DELAYED_LAST_OPTION_PRICE,
          IBApiNextTickType.DELAYED_LAST_OPTION_DELTA,
          IBApiNextTickType.DELAYED_LAST_OPTION_GAMMA,
          IBApiNextTickType.DELAYED_LAST_OPTION_VEGA,
          IBApiNextTickType.DELAYED_LAST_OPTION_THETA,
        ].includes(type as IBApiNextTickType)
      ) {
        // siliently ignore
        // console.log("silently ignored", type, tick);
      } else {
        console.log("ignored", type, tick);
      }
    });
    let price = dataset.previousClosePrice;
    if (dataset.price) price = dataset.price;
    if (dataset.ask && dataset.bid) price = (dataset.ask + dataset.bid) / 2;
    if (contract.secType == SecType.CASH) {
      // we do not get a price for CASH contracts
      dataset.price = price;
    }
    // if (contract.secType != "OPT")
    // console.log(`${contract.id}: ${contract.symbol} ${dataset.price} ${dataset.bid} ${dataset.ask} ${dataset.previousClosePrice} ${price}`);
    return Contract.update(dataset, {
      where: {
        id: contract.id,
      },
    }).then(() => {
      if (contract.secType == "OPT") {
        return Option.update(optdataset, { where: { id: contract.id } }).then(() => price);
      } else if (contract.secType == "CASH") {
        return Currency.update(
          { rate: price },
          {
            where: {
              base: contract.symbol.substring(0, 3),
              currency: contract.currency,
            },
            // logging: false,
          },
        ).then(() => price);
      } else {
        return price;
      }
    });
  }

  private findStockContractsToUpdatePrice(limit: number): Promise<Contract[]> {
    const now: number = Date.now() - STOCKS_PRICES_REFRESH_FREQ * 60 * 1000;
    return Contract.findAll({
      where: {
        secType: SecType.STK,
        updatedAt: {
          [Op.or]: {
            [Op.lt]: new Date(now),
            [Op.is]: undefined,
          },
        },
        exchange: {
          [Op.ne]: "VALUE", // Contracts that are not tradable (removed, merges, ...) are on 'VALUE' exchange
        },
      },
      limit: limit,
    });
  }

  private findPortfolioContractsNeedingPriceUpdate(limit: number): Promise<AnyContract[]> {
    // console.log("findOptionsToUpdatePrice", dte, age/1400, limit);
    const now: number = Date.now() - STOCKS_PRICES_REFRESH_FREQ * 60 * 1000;
    return Position.findAll({
      include: [
        {
          model: Contract,
          association: "contract",
          where: {
            updatedAt: {
              [Op.or]: {
                [Op.lt]: new Date(now),
                [Op.is]: null,
              },
            },
            exchange: {
              [Op.ne]: "VALUE", // Contracts that are not tradable (removed, merges, ...) are on VALUE exchange
            },
            secType: SecType.OPT,
          },
          required: true,
        },
      ],
      order: [["contract", "updatedAt", "ASC"]],
      limit: limit,
      // logging: console.log,
    }).then((positions: Position[]) =>
      Promise.all(
        positions.map((position: Position) => {
          // console.log("position", position);
          if (position.contract.secType == SecType.STK) {
            return Stock.findByPk(position.contract.id, {
              include: { association: "contract", required: true },
            }).then((contract) => {
              if (contract) return contract;
              else throw Error("Can not find Stock id: " + position.contract.id);
            });
          } else if (position.contract.secType == SecType.OPT) {
            return Option.findByPk(position.contract.id, {
              include: [
                {
                  as: "contract",
                  model: Contract,
                  required: true,
                },
                {
                  as: "stock",
                  model: Contract,
                  required: true,
                },
              ],
            }).then((contract) => {
              if (contract) return contract;
              else throw Error("Can not find Option id: " + position.contract.id);
            });
          } else {
            return Contract.findByPk(position.contract.id).then((contract) => {
              if (contract) return contract;
              else throw Error("Can not find Contract id: " + position.contract.id);
            });
          }
        }),
      ),
    );
  }

  private async iterateSecDefOptParamsForExpStrikes(
    stock: Contract,
    expirations: string[],
    strikes: number[],
  ): Promise<void> {
    // console.log(`iterateSecDefOptParamsForExpStrikes for ${stock.symbol}, ${expirations.length} exp, ${strikes.length} strikes`)
    for (const expstr of expirations) {
      const expdate = ITradingBot.expirationToDate(expstr);
      const days = (expdate.getTime() - Date.now()) / 60000 / 1440;
      if (days > 0 && days < OPTIONS_PRICE_TIMEFRAME) {
        console.log(stock.symbol, expstr, days, "days", strikes.length, "strikes");
        for (const strike of strikes) {
          // console.log("iterateSecDefOptParamsForExpStrikes", stock.symbol, expstr, strike);
          const ibContract: IbContract = {
            secType: SecType.OPT,
            symbol: stock.symbol,
            currency: stock.currency,
            lastTradeDateOrContractMonth: expstr,
            strike: strike,
            right: undefined,
          };
          // const put = this.buildOneOptionContract(stock, expstr, strike, OptionType.Put)
          //   .catch((err) => { /* silently ignore any error */ });
          // const call = this.buildOneOptionContract(stock, expstr, strike, OptionType.Call)
          //   .catch((err) => { /* silently ignore any error */ });
          ibContract.right = OptionType.Put;
          const put = this.findOrCreateContract(ibContract).catch(() => {
            /* silently ignore any error */
          });
          ibContract.right = OptionType.Call;
          const call = this.findOrCreateContract(ibContract).catch(() => {
            /* silently ignore any error */
          });
          await Promise.all([put, call]);
        }
      }
    }
    return Promise.resolve();
  }

  private iterateSecDefOptParams(stock: Contract, details: SecurityDefinitionOptionParameterType[]): Promise<void> {
    // console.log(`iterateSecDefOptParams: ${stock.symbol} ${details.length} details`)
    // use details associated to SMART exchange or first one if SMART not present
    let idx = 0;
    for (let i = 0; i < details.length; i++) {
      if (details[i].exchange == "SMART") {
        idx = i;
        break;
      }
    }
    return this.iterateSecDefOptParamsForExpStrikes(stock, details[idx].expirations, details[idx].strikes);
  }

  private requestSecDefOptParams(stock: Contract): Promise<SecurityDefinitionOptionParameterType[]> {
    console.log(`requestSecDefOptParams: ${stock.symbol}`);
    return this.api
      .getSecDefOptParams(
        stock.symbol,
        "", // exchange but only empty string returns results
        stock.secType as SecType,
        stock.conId,
      )
      .catch((err: IBApiNextError) => {
        console.log(`getSecDefOptParams failed with '${err.error.message}'`);
        throw err.error;
      });
  }

  private iterateToBuildOptionList(contracts: Contract[]): Promise<void> {
    console.log(`iterateToBuildOptionList ${contracts.length} items`);
    return contracts.reduce((p, stock) => {
      return p.then(() => {
        console.log(
          `iterateToBuildOptionList ${stock.symbol} ${stock["options_age"] * 24} vs ${OPTIONS_LIST_BUILD_FREQ}`,
        );
        if (stock["options_age"] * 24 > OPTIONS_LIST_BUILD_FREQ) {
          console.log("iterateToBuildOptionList: option contracts list need refreshing");
          return this.requestSecDefOptParams(stock).then((params) => this.iterateSecDefOptParams(stock, params));
        }
        return Promise.resolve();
      });
    }, Promise.resolve()); // initial
  }

  private findStocksToListOptions(): Promise<Contract[]> {
    return this.app.sequelize.query(
      `
    SELECT
      (julianday('now') - MAX(julianday(IFNULL(option.createdAt, '2022-01-01')))) options_age,
      contract.symbol, contract.con_id conId, contract.id id, contract.currency currency, contract.secType secType,
      option.createdAt
    FROM option, contract, trading_parameters
    WHERE contract.id = option.stock_id
      AND trading_parameters.stock_id =  option.stock_id
    GROUP BY option.stock_id
    ORDER BY options_age DESC
      `,
      {
        model: Contract,
        raw: true,
        type: QueryTypes.SELECT,
        // logging: console.log,
      },
    );
  }

  private buildOptionsList(): void {
    console.log("buildOptionsList");
    this.findStocksToListOptions()
      .then((stocks) => this.iterateToBuildOptionList(stocks))
      .then(() => setTimeout(() => this.emit("buildOptionsList"), 3600 * 1000))
      .catch((error) => console.error("updater bot build options list:", error));
  }

  private findOptionsToUpdatePrice(dte: number, age: number, limit: number): Promise<Option[]> {
    // console.log("findOptionsToUpdatePrice", dte, age/1400, limit);
    const now: number = Date.now();
    return Option.findAll({
      where: {
        lastTradeDate: {
          [Op.and]: {
            [Op.gte]: new Date(now), // don't update expired contracts
            [Op.lte]: new Date(now + 1440 * 60 * 1000 * dte),
          },
        },
      },
      include: [
        {
          // as: "contract",
          // model: Contract,
          association: "contract",
          where: {
            updatedAt: {
              [Op.or]: {
                [Op.lt]: new Date(now - age * 60 * 1000),
                [Op.is]: null,
              },
            },
            exchange: {
              [Op.ne]: "VALUE", // Contracts that are not tradable (removed, merges, ...) are on VALUE exchange
            },
          },
          required: true,
        },
        {
          // as: "stock",
          // model: Contract,
          association: "stock",
          required: true,
        },
      ],
      order: [["contract", "updatedAt", "ASC"]],
      limit: limit,
      // logging: console.log,
    });
  }

  private getBaseContract(aContract: AnyContract): Contract {
    let contract: Contract;
    if (aContract instanceof Contract) {
      contract = aContract;
    } else if (aContract instanceof Stock) {
      contract = aContract.contract;
    } else if (aContract instanceof Option) {
      contract = aContract.contract;
    } else {
      logger.error(MODULE + ".getBaseContract", "Unhandled contract type");
      throw Error("getBaseContract unhandled contract type");
    }
    return contract;
  }

  private fetchContractsPrices(contracts: AnyContract[]): Promise<void> {
    // fetch all contracts in parallel
    const promises: Promise<void>[] = [];
    for (const aContract of contracts) {
      const contract = this.getBaseContract(aContract);
      const ibContract: IbContract = {
        conId: contract.conId,
        secType: contract.secType as SecType,
        symbol: contract.symbol,
        currency: contract.currency,
        exchange: contract.exchange,
        lastTradeDateOrContractMonth: contract["lastTradeDateOrContractMonth"],
        strike: contract["strike"],
        right: contract["right"],
      };
      if (contract.secType == SecType.CASH) {
        ibContract.symbol = contract.symbol.substring(0, 3);
      } else if (contract.currency == "USD") {
        ibContract.exchange = "SMART"; // nothing except SMART seems to work for USD
      }
      // mark contract as updated
      contract.changed("price", true);
      promises.push(
        contract.save().then((contract) =>
          this.requestContractPrice(ibContract)
            .then((marketData) => this.updateContratPrice(contract, marketData))
            .then((_price) => {
              /* void */
            })
            .catch((err: { code: number; error: { message: string } }) => {
              // err.code == 200 || // 'No security definition has been found for the request'
              // err.code == 354 || // 'Requested market data is not subscribed.Delayed market data is not available.WBD NASDAQ.NMS/TOP/ALL'
              // err.code == 10090 || // 'Part of requested market data is not subscribed. Subscription-independent ticks are still active.Delayed market data is not available.XLV ARCA/TOP/ALL'
              // err.code == 10091 || // 'Part of requested market data requires additional subscription for API. See link in 'Market Data Connections' dialog for more details.Delayed market data is not available.SPY ARCA/TOP/ALL'
              // err.code == 10168 ||// 'Requested market data is not subscribed. Delayed market data is not enabled.'
              // err.code==10197 // 'No market data during competing live session'
              if (this.yahooBot && contract.exchange != "VALUE" && contract.currency == "USD") {
                return this.yahooBot.enqueueContract(aContract);
              } else {
                logger.info(
                  MODULE + ".fetchContractsPrices",
                  `Failed for contract id ${contract.id} ${contract.conId} ${contract.secType} ${contract.symbol} ${contract.currency} @ ${contract.exchange} with error ${err.code}: '${err.error?.message}'`,
                );
                return Promise.resolve();
              }
            }),
        ),
      );
    }
    return Promise.all(promises).then(() => this.yahooBot?.processQ());
  }

  private findCashContractsToUpdatePrice(limit: number): Promise<Contract[]> {
    const now: number = Date.now() - FX_RATES_REFRESH_FREQ * 60 * 1000;
    return Contract.findAll({
      where: {
        secType: SecType.CASH,
        updatedAt: {
          [Op.or]: {
            [Op.lt]: new Date(now),
            [Op.is]: undefined,
          },
        },
      },
      limit: limit,
    });
  }

  private createCashContracts(): void {
    Currency.findAll()
      .then((currencies) =>
        currencies.reduce((p, currency) => {
          return p.then(() => {
            const ibContract: IbContract = {
              symbol: currency.base,
              localSymbol: `${currency.base}.${currency.currency}`,
              secType: SecType.CASH,
              currency: currency.currency,
              exchange: "IDEALPRO",
            };
            return this.findOrCreateContract(ibContract)
              .catch((error: Error) => {
                throw Error(`createCashContracts failed for ${ibContract.localSymbol}: '${error.message}'`);
              })
              .then(() => Promise.resolve());
          });
        }, Promise.resolve()),
      )
      .then(() => setTimeout(() => this.emit("createCashContracts"), 10 * 60 * 1000)) // 10 minutes
      .catch((error) => console.error("createCashContracts:", error));
  }

  private concatAndUniquelyze(contracts: AnyContract[], c: AnyContract[]): AnyContract[] {
    return contracts
      .concat(c)
      .reduce((p, v) => (p.findIndex((q) => q.id == v.id) < 0 ? [...p, v] : p), [] as AnyContract[]);
  }

  private async updateOptionsPrice(): Promise<void> {
    console.log("updateOptionsPrice", new Date());
    let contracts: AnyContract[] = [];
    // update Fx rates
    if (contracts.length < BATCH_SIZE_OPTIONS_PRICE) {
      const c = await this.findCashContractsToUpdatePrice(BATCH_SIZE_OPTIONS_PRICE - contracts.length);
      console.log(c.length, "currency contract(s)");
      contracts = this.concatAndUniquelyze(contracts, c);
    }
    // update stocks
    if (contracts.length < BATCH_SIZE_OPTIONS_PRICE) {
      const c = await this.findStockContractsToUpdatePrice(BATCH_SIZE_OPTIONS_PRICE - contracts.length);
      console.log(c.length, "stock contract(s)");
      contracts = this.concatAndUniquelyze(contracts, c);
    }
    if (contracts.length < BATCH_SIZE_OPTIONS_PRICE) {
      const c = await this.findPortfolioContractsNeedingPriceUpdate(BATCH_SIZE_OPTIONS_PRICE - contracts.length);
      console.log(c.length, "portolio item(s)");
      contracts = this.concatAndUniquelyze(contracts, c);
    }
    // update option contracts prices
    if (contracts.length < BATCH_SIZE_OPTIONS_PRICE) {
      const c = await this.findOptionsToUpdatePrice(
        1,
        OPTIONS_PRICE_DTE_FREQ,
        BATCH_SIZE_OPTIONS_PRICE - contracts.length,
      );
      console.log(c.length, "one day option(s)");
      contracts = this.concatAndUniquelyze(contracts, c);
    }
    if (contracts.length < BATCH_SIZE_OPTIONS_PRICE) {
      const c = await this.findOptionsToUpdatePrice(
        7,
        OPTIONS_PRICE_WEEK_FREQ,
        BATCH_SIZE_OPTIONS_PRICE - contracts.length,
      );
      console.log(c.length, "one week option(s)");
      contracts = this.concatAndUniquelyze(contracts, c);
    }
    if (contracts.length < BATCH_SIZE_OPTIONS_PRICE) {
      const c = await this.findOptionsToUpdatePrice(
        31,
        OPTIONS_PRICE_MONTH_FREQ,
        BATCH_SIZE_OPTIONS_PRICE - contracts.length,
      );
      console.log(c.length, "one month option(s)");
      contracts = this.concatAndUniquelyze(contracts, c);
    }
    if (contracts.length < BATCH_SIZE_OPTIONS_PRICE) {
      const c = await this.findOptionsToUpdatePrice(
        100,
        OPTIONS_PRICE_MONTH_FREQ,
        BATCH_SIZE_OPTIONS_PRICE - contracts.length,
      );
      console.log(c.length, "three months option(s)");
      contracts = this.concatAndUniquelyze(contracts, c);
    }
    if (contracts.length < BATCH_SIZE_OPTIONS_PRICE) {
      const c = await this.findOptionsToUpdatePrice(
        999,
        OPTIONS_PRICE_OTHER_FREQ,
        BATCH_SIZE_OPTIONS_PRICE - contracts.length,
      );
      console.log(c.length, "other option(s)");
      contracts = this.concatAndUniquelyze(contracts, c);
    }
    await this.fetchContractsPrices(contracts);
    console.log("updateOptionsPrice done", new Date());
    const pause = contracts.length > 0 ? 1 : 30;
    setTimeout(() => this.emit("updateOptionsPrice"), pause * 1000);
  }
}
