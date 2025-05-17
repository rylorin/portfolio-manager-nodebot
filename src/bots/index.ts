import {
  ComboLeg,
  ContractDetails,
  IBApiNext,
  Contract as IbContract,
  Order as IbOrder,
  SecType as IbSecType,
  OrderAction,
  OrderType,
  SecType,
  TickType,
} from "@stoqey/ib";
import { IBApiNextTickType, IBApiTickType } from "@stoqey/ib/dist/api-next";
import { MutableMarketData } from "@stoqey/ib/dist/core/api-next/api/market/mutable-market-data";
import EventEmitter from "events";
import { Transaction } from "sequelize";
import { MyTradingBotApp } from "..";
import { LogLevel, default as logger } from "../logger";
import {
  BagContract,
  Balance,
  CashContract,
  Contract,
  Currency,
  FutureContract,
  Index,
  OptionContract,
  Portfolio,
  StockContract,
} from "../models";
import { BondContract } from "../models/bond_contract.model";
import { ContractType } from "../models/contract.types";
import { expirationToDateString } from "../models/date_utils";

const MODULE = "BotIndex";

const DEFAULT_TIMEOUT_SECONDS = 12;

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unused-vars
const sequelize_logging = (...args: any[]): void => logger.trace(MODULE + ".squelize", ...args);

export const timeoutPromise = async (secs: number, reason?: string): Promise<void> =>
  new Promise(
    (_, reject) => setTimeout(() => reject(new Error(reason ?? "timeout")), secs * 1_000), // Fail after some time
  );

export class ITradingBot extends EventEmitter {
  protected app: MyTradingBotApp;
  protected api: IBApiNext;
  protected accountNumber: string;
  private _portfolio: Portfolio;
  public get portfolio(): Portfolio {
    return this._portfolio;
  }
  protected baseRates: number[] = [];

  constructor(app: MyTradingBotApp, api: IBApiNext, account: string) {
    super();
    this.app = app;
    this.api = api;
    this.accountNumber = account;
  }

  /**
   * Print an object (JSON formatted) to console.
   */
  printObject(obj: unknown): void {
    this.app.printObject(obj);
  }

  /**
   * Print an info message to console
   */
  info(...message: any[]): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    logger.info(undefined, ...message);
  }

  /**
   * Print a warning message to console
   */
  warn(message: string): void {
    // console.error(colors.bold.yellow(`[${new Date().toLocaleTimeString()}] Warning: ${message}`));
    logger.warn(undefined, message);
  }

  /**
   * Print and error to console and exit the app with error code, unless -watch argument is present.
   */
  error(message: string): void {
    // console.error(colors.bold.red(`[${new Date().toLocaleTimeString()}] Error: ${message}`));
    logger.error(undefined, message);
  }

  public cancelOrder(orderId: number): void {
    this.api.cancelOrder(orderId);
  }

  public async placeNewOrder(contract: IbContract, order: IbOrder): Promise<number> {
    return this.api.placeNewOrder(contract, order);
  }

  protected static OptionComboContract(underlying: Contract, buyleg: number, sellleg: number): IbContract {
    const contract: IbContract = {
      symbol: underlying.symbol,
      secType: IbSecType.BAG,
      currency: underlying.currency,
      exchange: underlying.currency == "USD" ? "SMART" : (underlying.exchange ?? "SMART"),
    };
    const leg1: ComboLeg = {
      conId: buyleg,
      ratio: 1,
      action: OrderAction.BUY,
      exchange: "SMART",
      openClose: 0,
    };
    const leg2: ComboLeg = {
      conId: sellleg,
      ratio: 1,
      action: OrderAction.SELL,
      exchange: "SMART",
      openClose: 0,
    };
    contract.comboLegs = [leg1, leg2];
    return contract;
  }

  protected static OptionToIbContract(option: OptionContract): IbContract {
    const contract: IbContract = {
      secType: option.contract.secType as SecType,
      symbol: option.stock.symbol,
      currency: option.contract.currency,
      exchange: option.contract.exchange ?? "SMART",
      conId: option.contract.conId,
      strike: option.strike,
      right: option.callOrPut,
      lastTradeDateOrContractMonth: `${option.expiry}`,
      multiplier: option.multiplier,
    };
    return contract;
  }

  protected static ComboLimitOrder(action: OrderAction, quantity: number, limitPrice: number): IbOrder {
    const order: IbOrder = {
      action: action,
      orderType: OrderType.LMT,
      totalQuantity: quantity,
      lmtPrice: limitPrice,
      transmit: false,
    };
    return order;
  }

  protected static CspOrder(action: OrderAction, quantity: number, limitPrice: number): IbOrder {
    const order: IbOrder = {
      action: action,
      orderType: OrderType.LMT,
      totalQuantity: quantity,
      lmtPrice: limitPrice,
      transmit: false,
    };
    return order;
  }

  protected static CcOrder(action: OrderAction, quantity: number, limitPrice: number): IbOrder {
    const order: IbOrder = {
      action: action,
      orderType: OrderType.LMT,
      totalQuantity: quantity,
      lmtPrice: limitPrice,
      transmit: false,
    };
    return order;
  }

  protected async init(): Promise<void> {
    return Portfolio.findOne({
      where: {
        account: this.accountNumber,
      },
      include: [
        {
          model: Contract,
        },
        { model: Currency, as: "baseRates" },
        { association: "settings", include: [{ association: "underlying" }] },
      ],
      // logging: console.log,
    })
      .then(async (portfolio) => {
        if (portfolio) {
          this._portfolio = portfolio;
          return Currency.findAll({
            where: { base: portfolio.baseCurrency },
          });
        } else throw Error("portfolio not found");
      })
      .then((currencies) => {
        for (const currency of currencies) this.baseRates[currency.currency] = currency.rate;
        this.baseRates[this.portfolio.baseCurrency] = 1.0;
      });
  }

  public async getBalanceInBase(currency: string): Promise<number> {
    return Balance.findOne({
      where: {
        portfolio_id: this.portfolio.id,
        currency: currency,
      },
    }).then((balance) => {
      if (balance) return balance.quantity / this.baseRates[balance.currency];
      else return 0;
    });
  }

  public async getTotalBalanceInBase(): Promise<number> {
    return Balance.findAll({ where: { portfolio_id: this.portfolio.id } }).then((balances) => {
      return balances.reduce(
        (p, b) => {
          p.quantity += b.quantity / this.baseRates[b.currency];
          return p;
        },
        { quantity: 0, currency: this.portfolio.baseCurrency },
      ).quantity;
    });
  }

  protected static formatOptionName(ibContract: IbContract): string {
    const months: string[] = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const month: string = months[parseInt(ibContract.lastTradeDateOrContractMonth!.substring(4, 6)) - 1];
    const day: string = ibContract.lastTradeDateOrContractMonth!.substring(6, 8);
    const year: string = ibContract.lastTradeDateOrContractMonth!.substring(2, 4);
    const datestr: string = day + month + year;
    let strike: string = ibContract.strike!.toFixed(1);
    if (parseFloat(strike) != ibContract.strike) strike = ibContract.strike!.toString(); // new AMZN can have two decimals
    // const name = `${ibContract.symbol} ${datestr} ${strike} ${ibContract.right}`;
    return (
      ibContract.symbol +
      " " +
      datestr +
      (ibContract.strike ? " " + strike : "") +
      (ibContract.right ? " " + ibContract.right : "")
    );
  }

  protected async createStockContract(
    ibContract: IbContract,
    details: ContractDetails,
    transaction?: Transaction,
  ): Promise<Contract> {
    const contract_defaults = {
      conId: ibContract.conId!,
      secType: ibContract.secType as ContractType,
      symbol: ibContract.symbol!,
      currency: ibContract.currency!,
      exchange: ibContract.primaryExch || ibContract.exchange!,
      name: details.longName,
      isin: ibContract.secIdType == "ISIN" ? ibContract.secId : undefined,
    };
    if (!contract_defaults.isin) {
      details.secIdList?.forEach((item) => {
        if (item.tag == "ISIN") contract_defaults.isin = item.value;
      });
    }
    return Contract.findOrCreate({
      where: {
        secType: contract_defaults.secType,
        symbol: contract_defaults.symbol,
        currency: contract_defaults.currency,
      },
      defaults: contract_defaults,
      transaction: transaction,
    }).then(async ([contract, created]) => {
      const stock_defaults = {
        id: contract.id,
        industry: details.industry as string,
        category: details.category as string,
        subcategory: details.subcategory as string,
        // description: details.marketName as string,
      };
      return StockContract.findOrCreate({
        where: { id: contract.id },
        defaults: stock_defaults,
        transaction: transaction,
      })
        .then(async ([stock, created]) => {
          if (created) return stock;
          else return stock.update(stock_defaults, { transaction: transaction });
        })
        .then(async (_stock) => {
          if (created) return contract;
          else return contract.update(contract_defaults, { transaction: transaction });
        });
    });
  }

  protected async createIndexContract(
    ibContract: IbContract,
    details: ContractDetails,
    transaction?: Transaction,
  ): Promise<Contract> {
    const defaults = {
      conId: ibContract.conId!,
      secType: ibContract.secType as ContractType,
      symbol: ibContract.symbol!,
      currency: ibContract.currency!,
      exchange: ibContract.primaryExch || ibContract.exchange!,
      name: details.longName,
    };
    return Contract.findOrCreate({
      where: {
        secType: defaults.secType,
        symbol: defaults.symbol,
        currency: defaults.currency,
      },
      defaults: defaults,
      transaction: transaction,
      // logging: console.log,
    }).then(async ([contract, created]) => {
      if (created) {
        return Index.create({ id: contract.id }, { transaction: transaction }).then(async () =>
          Promise.resolve(contract),
        );
      } else {
        return contract.update(defaults, { transaction: transaction });
      }
    });
  }

  protected async createCashContract(
    ibContract: IbContract,
    _details: ContractDetails,
    transaction?: Transaction,
  ): Promise<Contract> {
    const defaults = {
      conId: ibContract.conId!,
      secType: ibContract.secType as ContractType,
      symbol: ibContract.localSymbol!,
      currency: ibContract.currency!,
      exchange: ibContract.exchange!,
      name: ibContract.localSymbol,
    };
    return Contract.findOrCreate({
      where: {
        secType: defaults.secType,
        symbol: defaults.symbol,
        currency: defaults.currency,
      },
      defaults: defaults,
      transaction: transaction,
      // logging: console.log,
    }).then(async ([contract, created]) => {
      if (created) {
        return CashContract.create({ id: contract.id }, { transaction: transaction }).then(async () =>
          Promise.resolve(contract),
        );
      } else {
        return contract.update(defaults, { transaction: transaction }).then(async () => Promise.resolve(contract));
      }
    });
  }

  protected async createBagContract(
    ibContract: IbContract,
    _details: undefined,
    transaction?: Transaction,
  ): Promise<Contract> {
    const defaults = {
      conId: ibContract.conId!,
      secType: ibContract.secType as ContractType,
      symbol: `${ibContract.tradingClass}-${ibContract.localSymbol}`,
      currency: ibContract.currency!,
      exchange: ibContract.exchange!,
      name: `${ibContract.tradingClass}-${ibContract.localSymbol}`,
    };
    return Contract.findOrCreate({
      where: {
        secType: defaults.secType,
        symbol: defaults.symbol,
        currency: defaults.currency,
      },
      defaults: defaults,
      transaction: transaction,
      // logging: console.log,
    }).then(async ([contract, created]) => {
      if (created) {
        return BagContract.create({ id: contract.id }, { transaction: transaction }).then(async () =>
          ibContract.comboLegs!.reduce(
            async (p, leg) =>
              p.then(async (contract) =>
                this.findOrCreateContract({ conId: leg.conId }, transaction).then(() => contract),
              ),
            Promise.resolve(contract),
          ),
        );
      } else {
        return contract.update(defaults, { transaction: transaction }).then(async () => Promise.resolve(contract));
      }
    });
  }

  protected async createFutureContract(
    ibContract: IbContract,
    details: ContractDetails,
    transaction?: Transaction,
  ): Promise<Contract> {
    const contract_values = {
      // Contract part of the future
      conId: ibContract.conId!,
      secType: ibContract.secType as ContractType,
      symbol: ITradingBot.formatOptionName(ibContract),
      currency: ibContract.currency!,
      exchange: ibContract.primaryExch || ibContract.exchange!,
      name: ITradingBot.formatOptionName(ibContract),
    };
    const future_values = {
      // future specific fields
      id: undefined as unknown as number,
      underlying_id: undefined as unknown as number,
      lastTradeDate: expirationToDateString(ibContract.lastTradeDateOrContractMonth!),
      multiplier: ibContract.multiplier!,
    };
    const underlying = {
      // future contract underlying
      conId: details.underConId,
      secType: details.underSecType,
      symbol: details.underSymbol,
      currency: ibContract.currency,
    };
    return this.findOrCreateContract(underlying, transaction).then(async (future) => {
      future_values.underlying_id = future.id;
      return FutureContract.findOne({
        where: {
          underlying_id: future_values.underlying_id,
          lastTradeDate: future_values.lastTradeDate,
        },
        transaction: transaction,
      }).then(async (option) => {
        if (option) {
          // update
          future_values.id = option.id;
          return Contract.update(contract_values, { where: { id: option.id }, transaction: transaction })
            .then(async () =>
              FutureContract.update(future_values, { where: { id: option.id }, transaction: transaction }),
            )
            .then(async () => Contract.findByPk(option.id, { transaction: transaction }))
            .then((contract) => contract!);
        } else {
          return Contract.create(contract_values, {
            transaction: transaction /* logging: console.log, */,
          }).then(async (contract) => {
            future_values.id = contract.id;
            return FutureContract.create(future_values, {
              transaction: transaction /* logging: false, */,
            }).then(async () => Promise.resolve(contract));
          });
        }
      });
    });
  }

  protected async createBondContract(
    ibContract: IbContract,
    _details: ContractDetails,
    transaction?: Transaction,
  ): Promise<Contract> {
    logger.log(LogLevel.Info, MODULE + ".createBondContract", ibContract.symbol, ibContract);
    const contract_values = {
      // Contract part
      conId: ibContract.conId!,
      secType: ibContract.secType as ContractType,
      symbol: ibContract.localSymbol || `${ibContract.secType}-${ibContract.conId}`,
      currency: ibContract.currency!,
      exchange: ibContract.primaryExch || ibContract.exchange!,
      name: ibContract.description ?? `${ibContract.secType}-${ibContract.conId}`,
    };
    const extended_values = {
      // specific fields
      id: undefined as unknown as number,
      underlying_id: undefined as unknown as number,
      lastTradeDate: expirationToDateString(ibContract.lastTradeDateOrContractMonth!),
      multiplier: ibContract.multiplier || 1,
      country: ibContract.localSymbol ? ibContract.localSymbol.substring(0, 2) : undefined,
    };
    return Contract.create(contract_values, {
      transaction: transaction /* logging: console.log, */,
    }).then(async (contract) => {
      extended_values.id = contract.id;
      // console.log(contract_values, extended_values);
      return BondContract.create(extended_values, {
        transaction: transaction /* logging: false, */,
      }).then(async () => Promise.resolve(contract));
    });
  }

  protected async createOptionContract(
    ibContract: IbContract,
    details: ContractDetails,
    transaction?: Transaction,
  ): Promise<Contract> {
    logger.log(LogLevel.Trace, MODULE + ".createOptionContract", undefined, ibContract, details);
    const contract_values = {
      // Contract part of the option
      conId: ibContract.conId!,
      secType: ibContract.secType! as ContractType,
      symbol: ibContract.localSymbol!,
      currency: ibContract.currency!,
      exchange: ibContract.primaryExch || ibContract.exchange!,
      name: ITradingBot.formatOptionName(ibContract),
    };
    const opt_values = {
      // option specific fields
      id: undefined as unknown as number,
      stock_id: undefined as unknown as number,
      lastTradeDate: expirationToDateString(ibContract.lastTradeDateOrContractMonth!),
      strike: ibContract.currency == "GBP" ? ibContract.strike! / 100 : ibContract.strike!,
      callOrPut: ibContract.right!,
      multiplier: ibContract.multiplier!,
      // delta: ibContract.right == OptionType.Call ? 0.5 : -0.5,
    };
    const underlying = {
      // option underlying contract
      conId: details.underConId,
      secType: details.underSecType,
      symbol: details.underSymbol,
      currency: ibContract.currency,
    };
    return this.findOrCreateContract(underlying, transaction).then(async (stock) => {
      opt_values.stock_id = stock.id;
      return OptionContract.findOne({
        where: {
          stock_id: opt_values.stock_id,
          lastTradeDate: opt_values.lastTradeDate,
          strike: opt_values.strike,
          callOrPut: opt_values.callOrPut,
        },
        transaction: transaction,
      }).then(async (option) => {
        if (option) {
          // update
          opt_values.id = option.id;
          return Contract.update(contract_values, { where: { id: option.id }, transaction: transaction })
            .then(async () => OptionContract.update(opt_values, { where: { id: option.id }, transaction: transaction }))
            .then(async () => Contract.findByPk(option.id, { transaction: transaction }))
            .then((contract) => contract!);
        } else {
          return Contract.create(contract_values, {
            transaction: transaction /* logging: console.log, */,
          }).then(async (contract) => {
            opt_values.id = contract.id;
            return OptionContract.create(opt_values, {
              transaction: transaction /* logging: false, */,
            }).then(async () => Promise.resolve(contract));
          });
        }
      });
    });
  }

  protected async findOrCreateContract(ibContract: IbContract, transaction?: Transaction): Promise<Contract> {
    logger.log(LogLevel.Trace, MODULE + ".findOrCreateContract", undefined, ibContract);
    const transaction_: Transaction | undefined = transaction; // the Transaction object that we eventually received
    let contract: Contract | null = null;
    try {
      if (!transaction_)
        transaction = await this.app.sequelize.transaction({
          type: Transaction.TYPES.DEFERRED,
        });
      // find DB contract by IB conId
      if (ibContract.conId) {
        contract = await Contract.findOne({
          where: { conId: ibContract.conId },
          transaction: transaction,
          // logging: console.log,
        });
        logger.log(LogLevel.Trace, MODULE + ".findOrCreateContract", undefined, "DB lookup", contract);
      }
      if (!contract) {
        // ibContract conId not found in DB, find by data and update it or create it
        // canonize ibContract
        let details: ContractDetails | undefined = undefined;
        // if (ibContract.secType != IbSecType.BAG) {
        if (ibContract.secType == IbSecType.STK && ibContract.currency == "USD") {
          // Workaround because sometimes NASDAQ (for example) as exchange doesn't get contract
          ibContract.exchange = "SMART";
        }
        logger.log(
          LogLevel.Trace,
          MODULE + ".findOrCreateContract",
          undefined,
          "requesting contract details",
          ibContract,
        );

        const detailstab: ContractDetails[] = await Promise.race([
          this.api.getContractDetails(ibContract),
          timeoutPromise(DEFAULT_TIMEOUT_SECONDS, `Timeout fetching ${ibContract.symbol} contract`).then(() => null),
        ]);

        // await this.api
        //   .getContractDetails(ibContract)
        //   .then((detailstab) => {
        if (detailstab.length >= 1) {
          details = detailstab[0];
          ibContract = details.contract;
          logger.log(LogLevel.Trace, MODULE + ".findOrCreateContract", undefined, "got contract details", ibContract);
        } else {
          logger.log(
            LogLevel.Error,
            MODULE + ".findOrCreateContract",
            undefined,
            "Contract details not found",
            ibContract,
          );
        }
        // })
        // .catch((err: IBApiNextError) => {
        //   const message = `getContractDetails failed for ${ibContract.secType} ${ibContract.symbol} ${ibContract.lastTradeDateOrContractMonth} ${ibContract.strike} ${ibContract.right} with error #${err.code}: '${err.error.message}'`;
        //   logger.log(LogLevel.Error, MODULE + ".findOrCreateContract", undefined, message, ibContract);
        //   throw {
        //     name: "IBApiNextError",
        //     message,
        //     code: err.code,
        //     parent: Error,
        //     original: Error,
        //   } as Error;
        // });
        if (details && ibContract.secType == IbSecType.STK) {
          contract = await this.createStockContract(ibContract, details, transaction);
        } else if (details && ibContract.secType == IbSecType.IND) {
          contract = await this.createIndexContract(ibContract, details, transaction);
        } else if (details && (ibContract.secType == IbSecType.OPT || ibContract.secType == IbSecType.FOP)) {
          contract = await this.createOptionContract(ibContract, details, transaction);
        } else if (details && ibContract.secType == IbSecType.CASH) {
          contract = await this.createCashContract(ibContract, details, transaction);
        } else if (details && ibContract.secType == IbSecType.FUT) {
          contract = await this.createFutureContract(ibContract, details, transaction);
        } else if (details && ibContract.secType == IbSecType.BOND) {
          contract = await this.createBondContract(ibContract, details, transaction);
        } else if (ibContract.secType == IbSecType.BOND && !details && ibContract.conId) {
          // Special case for BONDs. We often don't get details
          details = { contract: ibContract };
          contract = await this.createBondContract(ibContract, details, transaction);
        } else if (ibContract.secType == IbSecType.BAG) {
          contract = await this.createBagContract(ibContract, undefined, transaction);
        } else {
          // IB contract doesn't exists, we need to implement it!!!
          const message = `findOrCreateContract failed: IbSecType ${ibContract.secType} not implemented`;
          this.printObject(ibContract);
          if (details) this.printObject(details);
          throw { name: "ITradingBotNotImplemented", message } as Error;
        }
      }

      if (!transaction_) await transaction!.commit();
    } catch (err: any) {
      if (err.name == "IBApiNextError") {
        // silently ignore, only propagate
      } else {
        logger.error(
          MODULE + ".findOrCreateContract",
          `findOrCreateContract failed for ${ibContract.conId} ${ibContract.secType} ${ibContract.symbol} ${ibContract.lastTradeDateOrContractMonth} ${ibContract.strike} ${ibContract.right}:`,
        );
        // this.printObject(ibContract);
        // console.error(err);
        // console.error("transaction_", transaction_);
        // console.error("transaction", transaction);

        // if (err.name == "SequelizeTimeoutError") this.app.stop();
      }
      // rollback changes
      if (!transaction_) await transaction!.rollback();
      // and propagate exception
      throw err;
    }
    return contract;
  }

  protected async updateContratPrice(
    contract: Contract,
    marketData: MutableMarketData,
  ): Promise<number | undefined | null> {
    // Clear values, we can't keep old invalid values
    const dataset: {
      bid: number | null;
      ask: number | null;
      price: number | null;
      previousClosePrice?: number | null;
    } = { bid: null, ask: null, price: null };
    const optdataset: {
      pvDividend?: number | null;
      delta?: number | null;
      gamma?: number | null;
      impliedVolatility?: number | null;
      vega?: number | null;
      theta?: number | null;
    } = {};
    marketData.forEach((tick, type: TickType) => {
      // if (tick.value !== null)
      if (type == IBApiTickType.LAST || type == IBApiTickType.DELAYED_LAST) {
        dataset.price = tick.value;
      } else if (type == IBApiTickType.BID || type == IBApiTickType.DELAYED_BID) {
        dataset.bid = tick.value;
      } else if (type == IBApiTickType.ASK || type == IBApiTickType.DELAYED_ASK) {
        dataset.ask = tick.value;
      } else if (type == IBApiTickType.CLOSE || type == IBApiTickType.DELAYED_CLOSE) {
        // if (contract.secType == SecType.STK) console.log("CLOSE", tick.value);
        if (tick.value !== null) dataset.previousClosePrice = tick.value;
      } else if (type == IBApiNextTickType.OPTION_PV_DIVIDEND) {
        optdataset.pvDividend = tick.value;
      } else if (type == IBApiNextTickType.MODEL_OPTION_PRICE) {
        dataset.price = tick.value;
      } else if (type == IBApiNextTickType.MODEL_OPTION_DELTA) {
        optdataset.delta = tick.value;
      } else if (type == IBApiNextTickType.MODEL_OPTION_GAMMA) {
        optdataset.gamma = tick.value;
      } else if (type == IBApiNextTickType.MODEL_OPTION_VEGA) {
        optdataset.vega = tick.value;
      } else if (type == IBApiNextTickType.MODEL_OPTION_THETA) {
        optdataset.theta = tick.value;
      } else if (type == IBApiNextTickType.MODEL_OPTION_IV) {
        optdataset.impliedVolatility = tick.value;
        // } else if (type == IBApiNextTickType.MODEL_OPTION_PRICE) {
        //   if (!dataset.price && (tick.value as number) > 0) {
        //     dataset.price = tick.value;
        //   }
      }
    });
    // GBP prices are in pences, convert them
    if (contract.currency == "GBP" && contract.secType != SecType.CASH) {
      if (dataset.ask !== null) dataset.ask /= 100;
      if (dataset.bid !== null) dataset.bid /= 100;
      if (dataset.price !== null) dataset.price /= 100;
      if (dataset.previousClosePrice !== null) dataset.previousClosePrice /= 100;
    }
    let price: number | null = null;
    if (dataset.ask && dataset.bid) price = (dataset.ask + dataset.bid) / 2;
    else if (dataset.price) price = dataset.price;
    else if (dataset.previousClosePrice) price = dataset.previousClosePrice;
    if (contract.secType == SecType.CASH) {
      // we do not get a price for CASH contracts
      dataset.price = price;
    }
    // if (contract.id == 350889) console.log("Updating", contract.symbol, dataset);
    contract.set("bid", dataset.bid ?? null); // set `bid` to `null` if the value is `undefined`
    contract.set("ask", dataset.ask ?? null);
    contract.set("price", dataset.price ?? null);
    contract.set("previousClosePrice", dataset.previousClosePrice);
    contract.changed("bid", true); // mark `bid` as changed
    contract.changed("ask", true);
    contract.changed("price", true);
    contract.changed("updatedAt", true);
    return contract.save({ omitNull: false }).then(async (contract) => {
      // make sure to write null values
      // if (contract.id == 350889) console.log("Updated", contract.symbol, JSON.stringify(contract));
      if (contract.secType == "OPT") {
        return OptionContract.findByPk(contract.id)
          .then(async (option) => {
            option!.changed("updatedAt", true);
            return option!.update(optdataset);
          })
          .then(() => price);
      } else if (contract.secType == "CASH") {
        return Currency.update(
          { rate: price! },
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
}

export { AccountUpdateBot } from "./account.bot";
export { YahooUpdateBot } from "./yahoo.bot";

export const awaitTimeout = async (delay: number): Promise<unknown> =>
  new Promise((resolve): NodeJS.Timeout => setTimeout(resolve, delay * 1_000));
