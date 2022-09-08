import EventEmitter from "events";
import { Op, Transaction } from "sequelize";
import {
    IBApiNext,
    Contract as IbContract,
    ComboLeg,
    Order as IbOrder,
    OrderAction,
    OrderType,
    IBApiNextError,
    SecType,
    ContractDetails,
    OptionType,
} from "@stoqey/ib";
import {
    Contract,
    Stock,
    Option,
    Position,
    OpenOrder,
    Portfolio,
    Currency,
    Bag,
    Cash,
    Balance,
    Future,
} from "../models";
import { MyTradingBotApp } from "..";

type OptionsSynthesis = {
    value: number;
    engaged: number;
    risk: number;
    quantity: number;
    options: Option[];
}

export class ITradingBot extends EventEmitter {
    protected app: MyTradingBotApp;
    protected api: IBApiNext;
    protected accountNumber: string = undefined;
    protected portfolio: Portfolio = undefined;
    protected base_rates: number[] = [];

    constructor(app: MyTradingBotApp, api: IBApiNext, account?: string) {
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
    * Print and error to console and exit the app with error code, unless -watch argument is present.
    */
    error(text: string): void {
        this.app.error(text);
    }

    protected static expirationToDate(lastTradeDateOrContractMonth: string): Date {
        // convert YYYYMMDD to Date
        const lastTradeDate = new Date(
            parseInt(lastTradeDateOrContractMonth.substring(0, 4)),
            parseInt(lastTradeDateOrContractMonth.substring(4, 6)) - 1,
            parseInt(lastTradeDateOrContractMonth.substring(6, 8)),
        );
        return lastTradeDate;
    }

    protected static dateToExpiration(value: Date): string {
        // convert Date to YYYYMMDD
        const day: number = value.getDate();
        const month: number = value.getMonth() + 1;
        const year: number = value.getFullYear();
        const lastTradeDate: string = year.toString() + ((month < 10) ? ("0" + month) : month) + ((day < 10) ? ("0" + day) : day);
        return lastTradeDate;
    }

    protected static OptionComboContract(underlying: Contract, buyleg: number, sellleg: number): IbContract {
        const contract: IbContract = {
            symbol: underlying.symbol,
            secType: "BAG" as SecType,
            currency: underlying.currency,
            exchange: (underlying.currency == "USD") ? "SMART" : (underlying.exchange ?? "SMART"),
        };
        const leg1: ComboLeg = {
            conId: buyleg,
            ratio: 1,
            action: "BUY",
            exchange: "SMART",
        };
        const leg2: ComboLeg = {
            conId: sellleg,
            ratio: 1,
            action: "SELL",
            exchange: "SMART",
        };
        contract.comboLegs = [leg2, leg1];
        return contract;
    }

    protected static OptionToIbContract(underlying: Option): IbContract {
        const expiry = new Date(underlying.lastTradeDate);
        const contract: IbContract = {
            secType: underlying.contract.secType as SecType,
            symbol: underlying.stock.symbol,
            currency: underlying.contract.currency,
            exchange: underlying.contract.exchange ?? "SMART",
            conId: underlying.contract.conId,
            strike: underlying.strike,
            right: underlying.callOrPut,
            lastTradeDateOrContractMonth: expiry.toISOString().substring(0, 10).replaceAll("-", ""),
            multiplier: underlying.multiplier,
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

    protected static BenchmarkOrder(action: OrderAction, quantity: number): IbOrder {
        const order: IbOrder = {
            action: action,
            orderType: OrderType.MOC,
            // orderType: OrderType.MIDPRICE,
            totalQuantity: quantity,
            transmit: false,
        };
        return order;
    }

    protected init(): Promise<void> {
        return Portfolio.findOne({
            where: {
                account: this.accountNumber,
            },
            include: {
                model: Contract,
            },
            // logging: console.log, 
        }).then((portfolio) => {
            this.portfolio = portfolio;
            return Currency.findAll({
                where: { base: portfolio.baseCurrency },
            });
        }).then((currencies) => {
            for (const currency of currencies) this.base_rates[currency.currency] = currency.rate;
            this.base_rates[this.portfolio.baseCurrency] = 1.0;
        });
    }

    protected getContractPosition(benchmark: Contract): Promise<number> {
        if ((this.portfolio !== null) && (benchmark !== null)) {
            return Position.findOne({
                where: {
                    portfolio_id: this.portfolio.id,
                    contract_id: benchmark.id,
                },
            }).then((position) => position ? position.quantity : 0);
        } else {
            return Promise.resolve(0);
        }
    }

    protected getContractPositionValueInBase(benchmark: Contract): Promise<number> {
        return this.getContractPosition(benchmark)
            .then((position) => Currency.findOne({
                where: {
                    base: this.portfolio.baseCurrency,
                    currency: benchmark.currency,
                },
            }).then((currency) => ((position === null) || (currency === null)) ? 0 : (position * benchmark.livePrice / currency.rate))
            );
    }

    protected getContractOrdersQuantity(benchmark: Contract, actionType?: OrderAction): Promise<number> {
        const where: { portfolio_id: number; status: string[]; actionType?: OrderAction; } = {
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
                }
            }).then((orders: OpenOrder[]) => orders.reduce((p, order) => (p + (order.remainingQty)), 0));
        } else {
            return Promise.resolve(0);
        }
    }

    protected getContractOrderValueInBase(benchmark: Contract, actionType?: OrderAction): Promise<number> {
        if ((this.portfolio !== null) && (benchmark !== null)) {
            const where: { portfolio_id: number; actionType?: OrderAction; status: string[] } = {
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
                }
            }).then((orders: OpenOrder[]) => Currency.findOne({
                where: {
                    base: this.portfolio.baseCurrency,
                    currency: benchmark.currency,
                },
            }).then((currency) => orders.reduce((p, order) => (p + (order.remainingQty * benchmark.livePrice / currency.rate / (order.actionType == OrderAction.BUY ? 1 : -1))), 0))
            );
        } else {
            return Promise.resolve(0);
        }
    }

    private async sumOptionsPositionsSynthesisInBase(positions: Position[], underlying?: number, right?: OptionType): Promise<OptionsSynthesis> {
        const result = { value: 0, engaged: 0, risk: 0, quantity: 0, options: [] };
        const where: { id?: number; stock_id?: number; callOrPut?: OptionType, } = {};
        if (underlying) where.stock_id = underlying;
        if (right) where.callOrPut = right;
        for (const position of positions) {
            where.id = position.contract.id;
            const opt = await Option.findOne(
                {
                    where: where,
                },
            );
            if (opt != null) {
                result.quantity += position.quantity * opt.multiplier;
                result.value += position.quantity * opt.multiplier * position.contract.livePrice / this.base_rates[position.contract.currency];
                result.engaged += position.quantity * opt.multiplier * opt.strike / this.base_rates[position.contract.currency];
                result.risk += position.quantity * opt.multiplier * opt.strike * opt.delta / this.base_rates[position.contract.currency];
                result.options.push(opt);
            }
        }
        return result;
    }

    protected getOptionsPositionsSynthesisInBase(underlying: number, right?: OptionType, short?: boolean, long?: boolean): Promise<OptionsSynthesis> {
        if (this.portfolio !== null) {
            const where: { portfolio_id: number; quantity?; } = { portfolio_id: this.portfolio.id, };
            if (short && !long) where.quantity = { [Op.lt]: 0 };
            if (!short && long) where.quantity = { [Op.gt]: 0 };
            return Position.findAll(
                {
                    where: where,
                    include: {
                        model: Contract,
                        where: {
                            secType: SecType.OPT,
                        },
                    },
                }).then((positions: Position[]) => this.sumOptionsPositionsSynthesisInBase(positions, underlying, right));
        } else {
            return Promise.resolve({ engaged: 0, value: 0, risk: 0, quantity: 0, options: [] });
        }
    }

    protected getOptionsPositionsQuantity(underlying: Contract, right: OptionType): Promise<number> {
        return this.getOptionsPositionsSynthesisInBase(underlying.id, right)
            .then((r) => r.quantity);
    }

    protected getOptionPositionsValueInBase(underlying: number, right: OptionType): Promise<number> {
        return this.getOptionsPositionsSynthesisInBase(underlying, right)
            .then((r) => r.value);
    }

    protected getOptionsPositionsEngagedInBase(underlying: number, right: OptionType): Promise<number> {
        return this.getOptionsPositionsSynthesisInBase(underlying, right)
            .then((r) => r.engaged);
    }

    protected getOptionsPositionsRiskInBase(underlying: number, right: OptionType): Promise<number> {
        return this.getOptionsPositionsSynthesisInBase(underlying, right)
            .then((r) => r.risk);
    }

    protected getOptionShortPositionsValueInBase(underlying: number, right: OptionType): Promise<number> {
        return this.getOptionsPositionsSynthesisInBase(underlying, right, true)
            .then((r) => r.quantity);
    }

    private async sumOptionsOrdersInBase(orders: OpenOrder[], underlying: number, right?: OptionType): Promise<OptionsSynthesis> {
        const result = { value: 0, engaged: 0, risk: 0, quantity: 0, options: [] };
        for (const order of orders) {
            const where: { id: number; stock_id: number; callOrPut?: OptionType; } = {
                id: order.contract.id,
                stock_id: underlying,
            };
            if (right) where.callOrPut = right;
            await Option.findOne({ where: where, include: Contract, })
                .then((opt) => Currency.findOne({
                    where: {
                        base: this.portfolio.baseCurrency,
                        currency: order.contract.currency,
                    },
                }).then((currency) => {
                    if (opt !== null) {
                        result.quantity += order.remainingQty * opt.multiplier;
                        result.value += order.remainingQty * opt.multiplier * opt.contract.livePrice * (order.actionType == OrderAction.BUY ? 1 : -1) / currency.rate;
                        result.engaged += order.remainingQty * opt.multiplier * opt.strike * (order.actionType == OrderAction.BUY ? 1 : -1) / currency.rate;
                        result.risk += order.remainingQty * opt.multiplier * opt.strike * opt.delta * (order.actionType == OrderAction.BUY ? 1 : -1) / currency.rate;
                        result.options.push(opt);
                    }
                }));
        }
        return result;
    }

    protected getOptionsOrdersSynthesisInBase(underlying: number, right?: OptionType, actionType?: OrderAction): Promise<OptionsSynthesis> {
        if ((this.portfolio !== null) && (underlying !== null)) {
            const where: { portfolio_id: number; status: string[]; actionType?: OrderAction; } = {
                portfolio_id: this.portfolio.id,
                status: ["Submitted", "PreSubmitted"],
            };
            if (actionType) where.actionType = actionType;
            return OpenOrder.findAll({
                where: where,
                include: {
                    model: Contract,
                    where: {
                        secType: SecType.OPT,
                    },
                }
            }).then((orders: OpenOrder[]) => this.sumOptionsOrdersInBase(orders, underlying, right as OptionType));
        } else {
            return Promise.resolve({ engaged: 0, value: 0, risk: 0, quantity: 0, options: [] });
        }
    }

    protected getOptionsOrdersValueInBase(underlying: number, right: OptionType, actionType?: OrderAction): Promise<number> {
        return this.getOptionsOrdersSynthesisInBase(underlying, right, actionType)
            .then((r) => r.value);
    }

    protected getOptionsOrdersEngagedInBase(underlying: number, right: OptionType, actionType?: OrderAction): Promise<number> {
        return this.getOptionsOrdersSynthesisInBase(underlying, right, actionType)
            .then((r) => r.engaged);
    }

    protected getOptionsOrdersRiskInBase(underlying: number, right?: OptionType, actionType?: OrderAction): Promise<number> {
        return this.getOptionsOrdersSynthesisInBase(underlying, right, actionType)
            .then((r) => r.risk);
    }

    protected getOptionsOrdersQuantity(underlying: Contract, right: OptionType, actionType: OrderAction): Promise<number> {
        return this.getOptionsOrdersSynthesisInBase(underlying.id, right, actionType)
            .then((r) => r.quantity);
    }

    protected getBalanceInBase(currency: string): Promise<number> {
        return Balance.findOne(
            {
                where: {
                    portfolio_id: this.portfolio.id,
                    currency: currency,
                }
            }).then((balance) => {
                return balance.quantity / this.base_rates[balance.currency];
            });
    }

    protected getTotalBalanceInBase(): Promise<number> {
        return Balance.findAll({ where: { portfolio_id: this.portfolio.id, }, })
            .then((balances) => {
                return balances.reduce((p, b) => {
                    p.quantity += b.quantity / this.base_rates[b.currency];
                    return p;
                }, { quantity: 0, currency: this.portfolio.baseCurrency }).quantity;
            });
    }

    protected static formatOptionName(ibContract: IbContract): string {
        const months: string[] = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        const month: string = months[parseInt(ibContract.lastTradeDateOrContractMonth.substring(4, 6)) - 1];
        const day: string = ibContract.lastTradeDateOrContractMonth.substring(6, 8);
        const year: string = ibContract.lastTradeDateOrContractMonth.substring(2, 4);
        const datestr: string = day + month + year;
        let strike: string = ibContract.strike.toFixed(1);
        if (parseFloat(strike) != ibContract.strike) strike = ibContract.strike.toString(); // new AMZN can have two decimals
        const name = `${ibContract.symbol} ${datestr} ${strike} ${ibContract.right}`;
        return ibContract.symbol + " " + datestr + (strike ? " " + strike : "") + (ibContract.right ? " " + ibContract.right : "");
    }

    protected async findOrCreateContract(ibContract: IbContract, transaction?: Transaction): Promise<Contract> {
        const transaction_: Transaction = transaction;  // the Transaction object that we eventually received
        let contract: Contract = null;
        try {
            if (!transaction_) transaction = await this.app.sequelize.transaction({ type: Transaction.TYPES.DEFERRED });
            // find contract by IB conId
            if (ibContract.conId) {
                contract = await Contract.findOne({ where: { conId: ibContract.conId }, transaction: transaction, });
            }
            if (contract === null) {  // ibContract conId not found, find by data and update it or create it
                // canonize ibContract
                let details: ContractDetails = null;
                if (ibContract.secType != SecType.BAG) {
                    await this.api
                        .getContractDetails(ibContract)
                        .then((detailstab) => {
                            if (detailstab.length >= 1) {
                                details = detailstab[0];
                                ibContract = details.contract;
                            }
                        })
                        .catch((err: IBApiNextError) => {
                            const message = `findOrCreateContract.getContractDetails failed for ${ibContract.secType} ${ibContract.symbol} ${ibContract.lastTradeDateOrContractMonth} ${ibContract.strike} ${ibContract.right} with error #${err.code}: '${err.error.message}'`;
                            this.error(message);
                            throw { name: "IBApiNextError", message, code: err.code, parent: Error, original: Error } as Error;
                        });
                }
                if (details && (ibContract.secType == SecType.STK)) {
                    const defaults = {
                        conId: ibContract.conId,
                        secType: ibContract.secType,
                        symbol: ibContract.symbol,
                        currency: ibContract.currency,
                        exchange: ibContract.primaryExch || ibContract.exchange,
                        name: details.longName,
                    };
                    contract = await Contract.findOrCreate({
                        where: {
                            secType: defaults.secType,
                            symbol: defaults.symbol,
                            currency: defaults.currency,
                        },
                        defaults: defaults,
                        transaction: transaction,
                        // logging: console.log,
                    }).then(([contract, created]) => {
                        if (created) {
                            return Stock.create({ id: contract.id, }, { transaction: transaction, })
                                .then(() => Promise.resolve(contract));
                        } else {
                            return contract.update(defaults, { transaction: transaction, });
                        }
                    });
                } else if (details && (ibContract.secType == SecType.IND)) {
                    const defaults = {
                        conId: ibContract.conId,
                        secType: ibContract.secType,
                        symbol: ibContract.symbol,
                        currency: ibContract.currency,
                        exchange: ibContract.primaryExch || ibContract.exchange,
                        name: details.longName,
                    };
                    contract = await Contract.findOrCreate({
                        where: {
                            secType: defaults.secType,
                            symbol: defaults.symbol,
                            currency: defaults.currency,
                        },
                        defaults: defaults,
                        transaction: transaction,
                        // logging: console.log,
                    }).then(([contract, created]) => {
                        // if (created) {
                        // TODO: maybe required by PHP part to have a fake Index contract's child
                        // TODO: my now create Stock - which is incorrect - because Option "as one" Stock (not Contract)
                        //     return Stock.create({ id: contract.id, }, { transaction: transaction, })
                        //         .then(() => Promise.resolve(contract));
                        // } else {
                        return contract.update(defaults, { transaction: transaction, });
                        // }
                    });
                } else if (details && ((ibContract.secType == SecType.OPT) || (ibContract.secType == SecType.FOP))) {
                    const contract_values = {   // Contract part of the option
                        conId: ibContract.conId,
                        secType: ibContract.secType,
                        symbol: ibContract.localSymbol,
                        currency: ibContract.currency,
                        exchange: ibContract.primaryExch || ibContract.exchange,
                        name: ITradingBot.formatOptionName(ibContract),
                    };
                    const opt_values = {    // option specific fields
                        id: undefined,
                        stock_id: undefined,
                        lastTradeDate: ITradingBot.expirationToDate(ibContract.lastTradeDateOrContractMonth),
                        strike: ibContract.currency == "GBP" ? ibContract.strike / 100 : ibContract.strike,
                        callOrPut: ibContract.right,
                        multiplier: ibContract.multiplier,
                        delta: (ibContract.right == OptionType.Call) ? 0.5 : -0.5,
                    };
                    const underlying = {    // option underlying contract
                        conId: details.underConId,
                        secType: details.underSecType,
                        symbol: details.underSymbol,
                        currency: ibContract.currency,
                    };
                    contract = await this.findOrCreateContract(underlying, transaction)
                        .then((stock) => {
                            opt_values.stock_id = stock.id;
                            return Option.findOne({
                                where: {
                                    stock_id: opt_values.stock_id,
                                    lastTradeDate: opt_values.lastTradeDate,
                                    strike: opt_values.strike,
                                    callOrPut: opt_values.callOrPut,
                                },
                                transaction: transaction,
                            }).then((option) => {
                                if (option) {
                                    // update
                                    opt_values.id = option.id;
                                    return Contract.update({ values: contract_values }, { where: { id: option.id }, transaction: transaction, })
                                        .then(() => Option.update({ values: opt_values }, { where: { id: option.id }, transaction: transaction, }))
                                        .then(() => Contract.findByPk(option.id, { transaction: transaction, }));
                                } else {
                                    return Contract.create(contract_values, { transaction: transaction, /* logging: console.log, */ })
                                        .then((contract) => {
                                            opt_values.id = contract.id;
                                            return Option.create(opt_values, { transaction: transaction, /* logging: false, */ })
                                                .then(() => Promise.resolve(contract));
                                        });
                                }
                            });
                        });
                } else if (details && (ibContract.secType == SecType.CASH)) {
                    const defaults = {
                        conId: ibContract.conId,
                        secType: ibContract.secType,
                        symbol: ibContract.localSymbol,
                        currency: ibContract.currency,
                        exchange: ibContract.exchange,
                        name: ibContract.localSymbol,
                    };
                    contract = await Contract.findOrCreate({
                        where: {
                            secType: defaults.secType,
                            symbol: defaults.symbol,
                            currency: defaults.currency,
                        },
                        defaults: defaults,
                        transaction: transaction,
                        // logging: console.log,
                    }).then(([contract, created]) => {
                        if (created) {
                            return Cash.create({ id: contract.id, }, { transaction: transaction, })
                                .then(() => Promise.resolve(contract));
                        } else {
                            return contract.update({ values: defaults }, { transaction: transaction, })
                                .then(() => Promise.resolve(contract));
                        }
                    });
                } else if (details && (ibContract.secType == SecType.FUT)) {
                    const contract_values = {   // Contract part of the future
                        conId: ibContract.conId,
                        secType: ibContract.secType,
                        symbol: ITradingBot.formatOptionName(ibContract),
                        currency: ibContract.currency,
                        exchange: ibContract.primaryExch || ibContract.exchange,
                        name: ITradingBot.formatOptionName(ibContract),
                    };
                    const future_values = {    // future specific fields
                        id: undefined,
                        stock_id: undefined,
                        lastTradeDate: ITradingBot.expirationToDate(ibContract.lastTradeDateOrContractMonth),
                        multiplier: ibContract.multiplier,
                    };
                    const underlying = {    // future contract underlying
                        conId: details.underConId,
                        secType: details.underSecType,
                        symbol: details.underSymbol,
                        currency: ibContract.currency,
                    };
                    contract = await this.findOrCreateContract(underlying, transaction)
                        .then((future) => {
                            future_values.stock_id = future.id;
                            return Future.findOne({
                                where: {
                                    underlying_id: future_values.stock_id,
                                    lastTradeDate: future_values.lastTradeDate,
                                },
                                transaction: transaction,
                            }).then((option) => {
                                if (option) {
                                    // update
                                    future_values.id = option.id;
                                    return Contract.update({ values: contract_values }, { where: { id: option.id }, transaction: transaction, })
                                        .then(() => Future.update({ values: future_values }, { where: { id: option.id }, transaction: transaction, }))
                                        .then(() => Contract.findByPk(option.id, { transaction: transaction, }));
                                } else {
                                    return Contract.create(contract_values, { transaction: transaction, /* logging: console.log, */ })
                                        .then((contract) => {
                                            future_values.id = contract.id;
                                            return Future.create(future_values, { transaction: transaction, /* logging: false, */ })
                                                .then(() => Promise.resolve(contract));
                                        });
                                }
                            });
                        });
                } else if (ibContract.secType == SecType.BAG) {
                    contract = await Contract.create({
                        conId: ibContract.conId,
                        secType: ibContract.secType,
                        symbol: `${ibContract.tradingClass}-${ibContract.localSymbol}`,
                        currency: ibContract.currency,
                        exchange: ibContract.exchange,
                    }, { transaction: transaction, })
                        .then((contract) => Bag.create({ id: contract.id, }, { transaction: transaction, })
                            .then(() => ibContract.comboLegs.reduce((p, leg) => p.then((contract) => this.findOrCreateContract({ conId: leg.conId, }, transaction).then(() => contract)), Promise.resolve(contract)))
                        );
                } else {
                    // IB contract doesn't exists, we need to implement it!!!
                    const message = `findOrCreateContract failed: SecType ${ibContract.secType} not implemented`;
                    this.printObject(ibContract);
                    if (details) this.printObject(details);
                    throw { name: "ITradingBotNotImplemented", message, } as Error;
                }
            }
            if (!transaction_) await transaction.commit();
        } catch (err: any) {
            if (err.name == "IBApiNextError") {
                // silently ignore, only propagate
            } else {
                this.error(`findOrCreateContract failed for ${ibContract.secType} ${ibContract.symbol} ${ibContract.lastTradeDateOrContractMonth} ${ibContract.strike} ${ibContract.right}:`);
                // this.printObject(ibContract);
                console.error(err);
                console.error("transaction_", transaction_);
                console.error("transaction", transaction);
                if (err.name == "SequelizeTimeoutError") this.app.stop();
            }
            // rollback changes
            if (!transaction_) await transaction.rollback();
            // and propagate exception
            throw err;
        }
        return contract;
    }
}

export { ContractsUpdaterBot } from "./updater.bot";
export { AccountUpdateBot } from "./account.bot";
export { CashManagementBot } from "./cash.bot";
export { SellCoveredCallsBot } from "./cc.bot";
export { SellCashSecuredPutBot } from "./csp.bot";
export { RollOptionPositionsBot } from "./roll.bot";
export { YahooUpdateBot } from "./yahoo.bot";
export { OptionsCreateBot } from "./options.bot";
