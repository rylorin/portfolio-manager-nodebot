import {
  ComboLeg,
  ContractDetails,
  IBApiNext,
  IBApiNextError,
  Contract as IbContract,
  Order as IbOrder,
  SecType as IbSecType,
  OptionType,
  OrderAction,
  OrderType,
  SecType,
  TickType,
} from "@stoqey/ib";
import { IBApiNextTickType, IBApiTickType } from "@stoqey/ib/dist/api-next";
import { MutableMarketData } from "@stoqey/ib/dist/core/api-next/api/market/mutable-market-data";
import EventEmitter from "events";
import { Op, Transaction } from "sequelize";
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
  OpenOrder,
  OptionContract,
  Portfolio,
  Position,
  StockContract,
} from "../models";
import { BondContract } from "../models/bond_contract.model";
import { ContractType } from "../models/contract.types";
import { expirationToDateString } from "../models/date_utils";

const MODULE = "BotIndex";

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unused-vars
const sequelize_logging = (...args: any[]): void => logger.trace(MODULE + ".squelize", ...args);

type OptionsSynthesis = {
  value: number;
  engaged: number;
  risk: number;
  quantity: number;
  options: OptionContract[];
};

export class ITradingBot extends EventEmitter {
  protected app: MyTradingBotApp;
  protected api: IBApiNext;
  protected accountNumber: string;
  private _portfolio: Portfolio;
  public get portfolio(): Portfolio {
    return this._portfolio;
  }
  protected base_rates: number[] = [];

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
      secType: "BAG" as IbSecType,
      currency: underlying.currency,
      exchange: underlying.currency == "USD" ? "SMART" : (underlying.exchange ?? "SMART"),
    };
    const leg1: ComboLeg = {
      conId: buyleg,
      ratio: 1,
      action: OrderAction.BUY,
      exchange: "SMART",
    };
    const leg2: ComboLeg = {
      conId: sellleg,
      ratio: 1,
      action: OrderAction.SELL,
      exchange: "SMART",
    };
    contract.comboLegs = [leg2, leg1];
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
        for (const currency of currencies) this.base_rates[currency.currency] = currency.rate;
        this.base_rates[this.portfolio.baseCurrency] = 1.0;
      });
  }

  public async getContractPosition(contract: Contract): Promise<number> {
    if (this.portfolio !== null && contract !== null) {
      return Position.findOne({
        where: {
          portfolio_id: this.portfolio.id,
          contract_id: contract.id,
        },
        // logging: sequelize_logging,
      }).then((position) => {
        return position ? position.quantity : 0;
      });
    } else {
      return Promise.resolve(0);
    }
  }

  public async getContractPositionValueInBase(contract: Contract): Promise<number> {
    return this.getContractPosition(contract).then(async (position) => {
      return this.findOrCreateCurrency(contract.currency).then((currency) => {
        // console.log("getContractPositionValueInBase", position, contract.livePrice, currency.rate);
        return (position * contract.livePrice) / currency.rate;
      });
    });
  }

  private async findOrCreateCurrency(symbol: string): Promise<Currency> {
    const currency = this.portfolio.baseRates.find((currency) => currency.currency == symbol);
    if (!currency) {
      return this.findOrCreateContract({
        secId: SecType.CASH,
        currency: symbol,
        symbol: symbol + "." + this.portfolio.baseCurrency,
      }).then(async (contract) =>
        Currency.create({
          base: this.portfolio.baseCurrency,
          currency: symbol,
          rate: contract.price!,
        }),
      );
    } else {
      return Promise.resolve(currency);
    }
  }

  public async getContractOrdersQuantity(benchmark: Contract, actionType?: OrderAction): Promise<number> {
    const where: {
      portfolio_id: number;
      status: string[];
      actionType?: OrderAction;
    } = {
      portfolio_id: this.portfolio.id,
      status: ["Submitted", "PreSubmitted"],
    };
    if (actionType) where.actionType = actionType;
    if (benchmark !== null) {
      return OpenOrder.findAll({
        where: where,
        include: {
          model: Contract,
          where: {
            id: benchmark.id,
          },
        },
      }).then((orders: OpenOrder[]) => orders.reduce((p, order) => p + order.remainingQty, 0));
    } else {
      return Promise.resolve(0);
    }
  }

  protected async getContractOrderValueInBase(benchmark: Contract, actionType?: OrderAction): Promise<number> {
    if (this.portfolio !== null && benchmark !== null) {
      const where: {
        portfolio_id: number;
        actionType?: OrderAction;
        status: string[];
      } = {
        portfolio_id: this.portfolio.id,
        status: ["Submitted", "PreSubmitted"],
      };
      if (actionType) where.actionType = actionType;
      return OpenOrder.findAll({
        where: where,
        include: {
          model: Contract,
          where: {
            id: benchmark.id,
          },
        },
      }).then(async (orders: OpenOrder[]) =>
        Currency.findOne({
          where: {
            base: this.portfolio.baseCurrency,
            currency: benchmark.currency,
          },
        }).then((currency) => {
          if (currency) {
            return orders.reduce(
              (p, order) =>
                p +
                (order.remainingQty * benchmark.livePrice) /
                  currency.rate /
                  (order.actionType == OrderAction.BUY ? 1 : -1),
              0,
            );
          } else throw Error("currency not found");
        }),
      );
    } else {
      return Promise.resolve(0);
    }
  }

  private async sumOptionsPositionsSynthesisInBase(
    positions: Position[],
    underlying?: number,
    right?: OptionType,
  ): Promise<OptionsSynthesis> {
    const result = { value: 0, engaged: 0, risk: 0, quantity: 0, options: [] as OptionContract[] };
    const where: { id?: number; stock_id?: number; callOrPut?: OptionType } = {};
    if (underlying) where.stock_id = underlying;
    if (right) where.callOrPut = right;
    for (const position of positions) {
      where.id = position.contract.id;
      // strange ... we might have more than one option matching criteria!
      const opt = await OptionContract.findOne({
        where: where,
      });
      if (opt != null) {
        result.quantity += position.quantity * opt.multiplier;
        result.value +=
          (position.quantity * opt.multiplier * position.contract.livePrice) /
          this.base_rates[position.contract.currency];
        result.engaged +=
          (position.quantity * opt.multiplier * opt.strike) / this.base_rates[position.contract.currency];
        result.risk +=
          (position.quantity *
            opt.multiplier *
            opt.strike *
            (opt.delta ? opt.delta : opt.callOrPut == OptionType.Call ? +0.5 : -0.5)) /
          this.base_rates[position.contract.currency];
        result.options.push(opt);
      }
    }
    return result;
  }

  protected async getOptionsPositionsSynthesisInBase(
    underlying?: number,
    right?: OptionType,
    short?: boolean,
    long?: boolean,
  ): Promise<OptionsSynthesis> {
    if (this.portfolio !== null) {
      const where: { portfolio_id: number; quantity? } = {
        portfolio_id: this.portfolio.id,
      };
      if (short && !long) where.quantity = { [Op.lt]: 0 };
      if (!short && long) where.quantity = { [Op.gt]: 0 };
      return Position.findAll({
        where: where,
        include: {
          model: Contract,
          where: {
            secType: IbSecType.OPT,
          },
        },
      }).then(async (positions: Position[]) => this.sumOptionsPositionsSynthesisInBase(positions, underlying, right));
    } else {
      return Promise.resolve({
        engaged: 0,
        value: 0,
        risk: 0,
        quantity: 0,
        options: [],
      });
    }
  }

  protected async getOptionsPositionsQuantity(underlying: Contract, right: OptionType): Promise<number> {
    return this.getOptionsPositionsSynthesisInBase(underlying.id, right).then((r) => r.quantity);
  }

  public async getOptionPositionsValueInBase(
    underlying: number | undefined,
    right: OptionType | undefined,
  ): Promise<number> {
    return this.getOptionsPositionsSynthesisInBase(underlying, right).then((r) => r.value);
  }

  protected async getOptionsPositionsEngagedInBase(underlying: number, right: OptionType): Promise<number> {
    return this.getOptionsPositionsSynthesisInBase(underlying, right).then((r) => r.engaged);
  }

  public async getOptionsPositionsRiskInBase(
    underlying: number | undefined,
    right: OptionType | undefined,
  ): Promise<number> {
    return this.getOptionsPositionsSynthesisInBase(underlying, right).then((r) => r.risk);
  }

  protected async getOptionShortPositionsValueInBase(underlying: number, right: OptionType): Promise<number> {
    return this.getOptionsPositionsSynthesisInBase(underlying, right, true).then((r) => r.quantity);
  }

  private async sumOptionsOrdersInBase(
    orders: OpenOrder[],
    underlying: number,
    right?: OptionType,
  ): Promise<OptionsSynthesis> {
    const result: OptionsSynthesis = { value: 0, engaged: 0, risk: 0, quantity: 0, options: [] };
    for (const order of orders) {
      const where: { id: number; stock_id: number; callOrPut?: OptionType } = {
        id: order.contract.id,
        stock_id: underlying,
      };
      if (right) where.callOrPut = right;
      await OptionContract.findOne({
        where: where,
        include: { as: "contract", model: Contract, required: true },
      }).then(async (opt) =>
        Currency.findOne({
          where: {
            base: this.portfolio.baseCurrency,
            currency: order.contract.currency,
          },
        }).then((currency) => {
          if (opt !== null && currency) {
            result.quantity += order.remainingQty * opt.multiplier;
            result.value +=
              (order.remainingQty *
                opt.multiplier *
                opt.contract.livePrice *
                (order.actionType == OrderAction.BUY ? 1 : -1)) /
              currency.rate;
            result.engaged +=
              (order.remainingQty * opt.multiplier * opt.strike * (order.actionType == OrderAction.BUY ? 1 : -1)) /
              currency.rate;
            result.risk +=
              (order.remainingQty *
                opt.multiplier *
                opt.strike *
                (opt.delta ? opt.delta : opt.callOrPut == OptionType.Call ? +0.5 : -0.5) *
                (order.actionType == OrderAction.BUY ? 1 : -1)) /
              currency.rate;
            result.options.push(opt);
          }
        }),
      );
    }
    return result;
  }

  protected async getOptionsOrdersSynthesisInBase(
    underlying: number,
    right?: OptionType,
    actionType?: OrderAction,
  ): Promise<OptionsSynthesis> {
    if (this.portfolio !== null && underlying !== null) {
      const where: {
        portfolio_id: number;
        status: string[];
        actionType?: OrderAction;
      } = {
        portfolio_id: this.portfolio.id,
        status: ["Submitted", "PreSubmitted"],
      };
      if (actionType) where.actionType = actionType;
      return OpenOrder.findAll({
        where: where,
        include: {
          model: Contract,
          where: {
            secType: IbSecType.OPT,
          },
        },
      }).then(async (orders: OpenOrder[]) => this.sumOptionsOrdersInBase(orders, underlying, right));
    } else {
      return Promise.resolve({
        engaged: 0,
        value: 0,
        risk: 0,
        quantity: 0,
        options: [],
      });
    }
  }

  protected async getOptionsOrdersValueInBase(
    underlying: number,
    right: OptionType,
    actionType?: OrderAction,
  ): Promise<number> {
    return this.getOptionsOrdersSynthesisInBase(underlying, right, actionType).then((r) => r.value);
  }

  protected async getOptionsOrdersEngagedInBase(
    underlying: number,
    right: OptionType,
    actionType?: OrderAction,
  ): Promise<number> {
    return this.getOptionsOrdersSynthesisInBase(underlying, right, actionType).then((r) => r.engaged);
  }

  protected async getOptionsOrdersRiskInBase(
    underlying: number,
    right?: OptionType,
    actionType?: OrderAction,
  ): Promise<number> {
    return this.getOptionsOrdersSynthesisInBase(underlying, right, actionType).then((r) => r.risk);
  }

  public async getOptionsOrdersQuantity(
    underlying: Contract,
    right: OptionType,
    actionType: OrderAction,
  ): Promise<number> {
    return this.getOptionsOrdersSynthesisInBase(underlying.id, right, actionType).then((r) => r.quantity);
  }

  public async getBalanceInBase(currency: string): Promise<number> {
    return Balance.findOne({
      where: {
        portfolio_id: this.portfolio.id,
        currency: currency,
      },
    }).then((balance) => {
      if (balance) return balance.quantity / this.base_rates[balance.currency];
      else return 0;
    });
  }

  public async getTotalBalanceInBase(): Promise<number> {
    return Balance.findAll({ where: { portfolio_id: this.portfolio.id } }).then((balances) => {
      return balances.reduce(
        (p, b) => {
          p.quantity += b.quantity / this.base_rates[b.currency];
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
      delta: ibContract.right == OptionType.Call ? 0.5 : -0.5,
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
        if (ibContract.secType != IbSecType.BAG) {
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
          await this.api
            .getContractDetails(ibContract)
            .then((detailstab) => {
              if (detailstab.length >= 1) {
                details = detailstab[0];
                ibContract = details.contract;
                logger.log(
                  LogLevel.Trace,
                  MODULE + ".findOrCreateContract",
                  undefined,
                  "got contract details",
                  ibContract,
                );
              } else {
                logger.log(
                  LogLevel.Warning,
                  MODULE + ".findOrCreateContract",
                  undefined,
                  "Contract details not found",
                  ibContract,
                );
              }
            })
            .catch((err: IBApiNextError) => {
              const message = `getContractDetails failed for ${ibContract.secType} ${ibContract.symbol} ${ibContract.lastTradeDateOrContractMonth} ${ibContract.strike} ${ibContract.right} with error #${err.code}: '${err.error.message}'`;
              logger.log(LogLevel.Error, MODULE + ".findOrCreateContract", undefined, message, ibContract);
              throw {
                name: "IBApiNextError",
                message,
                code: err.code,
                parent: Error,
                original: Error,
              } as Error;
            });
        }
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
      if (tick.value)
        if (type == IBApiTickType.LAST || type == IBApiTickType.DELAYED_LAST) {
          dataset.price = (tick.value as number) > 0 ? tick.value : null;
        } else if (type == IBApiTickType.BID || type == IBApiTickType.DELAYED_BID) {
          dataset.bid = (tick.value as number) > 0 ? tick.value : null;
        } else if (type == IBApiTickType.ASK || type == IBApiTickType.DELAYED_ASK) {
          dataset.ask = (tick.value as number) > 0 ? tick.value : null;
        } else if (type == IBApiTickType.CLOSE || type == IBApiTickType.DELAYED_CLOSE) {
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
            IBApiTickType.DELAYED_BID_SIZE,
            IBApiTickType.DELAYED_ASK_SIZE,
            IBApiTickType.DELAYED_LAST_SIZE,
            IBApiTickType.DELAYED_OPEN,
            IBApiTickType.DELAYED_HIGH,
            IBApiTickType.DELAYED_LOW,
            IBApiTickType.DELAYED_VOLUME,
          ].includes(type as IBApiTickType)
        ) {
          // siliently ignore
          // console.log('silently ignored', type, tick);
        } else if (type == IBApiNextTickType.OPTION_PV_DIVIDEND) {
          optdataset.pvDividend = tick.value;
        } else if (type == IBApiNextTickType.LAST_OPTION_PRICE || type == IBApiNextTickType.DELAYED_LAST_OPTION_PRICE) {
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
          // } else if (type == IBApiNextTickType.MODEL_OPTION_PRICE) {
          //   if (!dataset.price && (tick.value as number) > 0) {
          //     dataset.price = tick.value;
          //   }
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
            // would it be interesting to use OPTION_UNDERLYING to update underlying?
            IBApiNextTickType.OPTION_UNDERLYING,
            IBApiNextTickType.BID_OPTION_IV,
            IBApiNextTickType.BID_OPTION_PRICE,
            IBApiNextTickType.BID_OPTION_DELTA,
            IBApiNextTickType.BID_OPTION_GAMMA,
            IBApiNextTickType.BID_OPTION_VEGA,
            IBApiNextTickType.BID_OPTION_THETA,
            IBApiNextTickType.ASK_OPTION_IV,
            IBApiNextTickType.ASK_OPTION_PRICE,
            IBApiNextTickType.ASK_OPTION_DELTA,
            IBApiNextTickType.ASK_OPTION_GAMMA,
            IBApiNextTickType.ASK_OPTION_VEGA,
            IBApiNextTickType.ASK_OPTION_THETA,
            IBApiNextTickType.MODEL_OPTION_PRICE, // ?
            // Would be interesting to use delayed data if no live data available
            IBApiNextTickType.DELAYED_BID_OPTION_IV,
            IBApiNextTickType.DELAYED_BID_OPTION_PRICE,
            IBApiNextTickType.DELAYED_BID_OPTION_DELTA,
            IBApiNextTickType.DELAYED_BID_OPTION_GAMMA,
            IBApiNextTickType.DELAYED_BID_OPTION_VEGA,
            IBApiNextTickType.DELAYED_BID_OPTION_THETA,
            IBApiNextTickType.DELAYED_ASK_OPTION_IV,
            IBApiNextTickType.DELAYED_ASK_OPTION_PRICE,
            IBApiNextTickType.DELAYED_ASK_OPTION_DELTA,
            IBApiNextTickType.DELAYED_ASK_OPTION_GAMMA,
            IBApiNextTickType.DELAYED_ASK_OPTION_VEGA,
            IBApiNextTickType.DELAYED_ASK_OPTION_THETA,
            IBApiNextTickType.DELAYED_LAST_OPTION_IV,
            IBApiNextTickType.DELAYED_LAST_OPTION_DELTA,
            IBApiNextTickType.DELAYED_LAST_OPTION_GAMMA,
            IBApiNextTickType.DELAYED_LAST_OPTION_VEGA,
            IBApiNextTickType.DELAYED_LAST_OPTION_THETA,
            IBApiNextTickType.DELAYED_MODEL_OPTION_IV,
            IBApiNextTickType.DELAYED_MODEL_OPTION_PRICE,
            IBApiNextTickType.DELAYED_MODEL_OPTION_DELTA,
            IBApiNextTickType.DELAYED_MODEL_OPTION_GAMMA,
            IBApiNextTickType.DELAYED_MODEL_OPTION_VEGA,
            IBApiNextTickType.DELAYED_MODEL_OPTION_THETA,
          ].includes(type as IBApiNextTickType)
        ) {
          // siliently ignore
          // console.log("silently ignored", type, tick);
        } else {
          console.log("ignored", type, tick);
        }
    });
    let price: number | null;
    if (dataset.ask && dataset.bid) price = (dataset.ask + dataset.bid) / 2;
    else if (dataset.price) price = dataset.price;
    else price = dataset.previousClosePrice ?? null;
    if (contract.secType == SecType.CASH) {
      // we do not get a price for CASH contracts
      dataset.price = price;
    }
    // console.log(contract.symbol, dataset, price);
    return Contract.update(dataset, {
      where: {
        id: contract.id,
      },
    }).then(async () => {
      if (contract.secType == "OPT") {
        return OptionContract.update(optdataset, { where: { id: contract.id } }).then(() => price);
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
        return price ? (contract.currency == "GBP" ? price / 100 : price) : price;
      }
    });
  }
}

export { AccountUpdateBot } from "./account.bot";
export { SellCoveredCallsBot } from "./cc.bot";
export { SellCashSecuredPutBot } from "./csp.bot";
export { RollOptionPositionsBot } from "./roll.bot";
export { ContractsUpdaterBot } from "./updater.bot";
export { YahooUpdateBot } from "./yahoo.bot";

export const awaitTimeout = async (delay: number): Promise<unknown> =>
  new Promise((resolve): NodeJS.Timeout => setTimeout(resolve, delay * 1_000));
