import { IBApiNextApp } from "@stoqey/ib/dist/tools/common/ib-api-next-app";
import EventEmitter from "events";
import {
    IBApiNext,
    Contract as IbContract,
    ComboLeg,
    Order as IbOrder,
    OrderAction,
    OrderType,
    IBApiNextError,
    BarSizeSetting,
    SecType,
    ContractDetails,
    OptionType,
    Bar,
    TickType,
} from "@stoqey/ib";
import {
    sequelize,
    Contract,
    Stock,
    Option,
    Position,
    OpenOrder,
    Parameter,
    Portfolio,
    Currency,
    Bag,
    Cash,
    Balance,
} from "../models";

export class ITradingBot extends EventEmitter {
    protected app: IBApiNextApp;
    protected api: IBApiNext;
    protected accountNumber: string = undefined;
    protected portfolio: Portfolio = undefined;
    protected base_rates: number[] = [];

    constructor(app: IBApiNextApp, api: IBApiNext, account?: string) {
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
            symbol: underlying.stock.contract.symbol,
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
            }).then((currency) => ((position === null) || (currency === null)) ? 0 : (position * benchmark.price / currency.rate))
            );
    }

    private async sumOptionsPositionsEngagedInBase(positions: Position[], underlying: number, right: OptionType): Promise<number> {
        let result = 0;
        const where: any = {};
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
                result += position.quantity * opt.multiplier * opt.strike / this.base_rates[position.contract.currency];
            }
        }
        console.log(`sumOptionsPositionsEngagedInBase(${underlying}, ${right}): ${result}`);
        return result;
    }

    protected getOptionPositionsEngagedInBase(underlying: number, right: OptionType): Promise<number> {
        if (this.portfolio !== null) {
            return Position.findAll(
                {
                    where: {
                        portfolio_id: this.portfolio.id,
                    },
                    include: {
                        model: Contract,
                        where: {
                            secType: "OPT",
                        },
                    },
                }).then((positions: Position[]) => this.sumOptionsPositionsEngagedInBase(positions, underlying, right));
        } else {
            return Promise.resolve(0);
        }
    }

    private async sumOptionsPositionsRiskInBase(positions: Position[], underlying: number, right: OptionType): Promise<number> {
        let result = 0;
        const where: any = {};
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
                result += position.quantity * opt.multiplier * opt.strike * opt.delta / this.base_rates[position.contract.currency];
            }
        }
        console.log(`sumOptionsPositionsRiskInBase(${underlying}, ${right}): ${result}`);
        return result;
    }

    protected getOptionPositionsRiskInBase(underlying: number, right: OptionType): Promise<number> {
        if (this.portfolio !== null) {
            return Position.findAll(
                {
                    where: {
                        portfolio_id: this.portfolio.id,
                    },
                    include: {
                        model: Contract,
                        where: {
                            secType: "OPT",
                        },
                    },
                }).then((positions: Position[]) => this.sumOptionsPositionsRiskInBase(positions, underlying, right));
        } else {
            return Promise.resolve(0);
        }
    }

    private async sumOptionsPositionsValueInBase(positions: Position[], underlying: number, right: OptionType): Promise<number> {
        let result = 0;
        const where: any = {};
        if (underlying) where.stock_id = underlying;
        if (right) where.callOrPut = right;
        for (const position of positions) {
            where.id = position.contract.id;
            const opt = await Option.findOne({ where: where, },);
            if (opt != null) {
                result += position.quantity * opt.multiplier * position.contract.price / this.base_rates[position.contract.currency];
            }
        }
        console.log(`sumOptionsPositionsValueInBase(${underlying}, ${right}): ${result}`);
        return result;
    }

    protected getOptionPositionsValueInBase(underlying: number, right: OptionType): Promise<number> {
        if (this.portfolio !== null) {
            return Position.findAll(
                {
                    where: {
                        portfolio_id: this.portfolio.id,
                    },
                    include: {
                        model: Contract,
                        where: {
                            secType: "OPT",
                        },
                    },
                }).then((positions: Position[]) => this.sumOptionsPositionsValueInBase(positions, underlying, right));
        } else {
            return Promise.resolve(0);
        }
    }

    private async sumOptionsPositionsQuantity(positions: Position[], underlying: Contract, right: OptionType): Promise<number> {
        let result = 0;
        for (const position of positions) {
            await Option.findOne(
                {
                    where: {
                        id: position.contract.id,
                        callOrPut: right,
                        stock_id: underlying.id,
                    },
                },
            ).then((opt) => {
                if (opt !== null) result += position.quantity * opt.multiplier;
            });
        }
        return result;
    }

    protected getOptionsPositionsQuantity(underlying: Contract, right: OptionType): Promise<number> {
        if (underlying !== null) {
            return Position.findAll(
                {
                    where: {
                        portfolio_id: this.portfolio.id,
                    },
                    include: {
                        model: Contract,
                        where: {
                            secType: "OPT",
                        },
                    },
                }).then((positions: Position[]) => this.sumOptionsPositionsQuantity(positions, underlying, right));
        } else {
            return Promise.resolve(0);
        }
    }

    protected getContractOrderValueInBase(benchmark: Contract, actionType: OrderAction): Promise<number> {
        if ((this.portfolio !== null) && (benchmark !== null)) {
            return OpenOrder.findAll({
                where: {
                    portfolio_id: this.portfolio.id,
                    actionType: actionType,
                    status: ["Submitted", "PreSubmitted"],
                },
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
            }).then((currency) => orders.reduce((p, order) => (p + (order.remainingQty * benchmark.price / currency.rate)), 0))
            );
        } else {
            return Promise.resolve(0);
        }
    }

    protected getContractOrdersQuantity(benchmark: Contract, actionType: OrderAction): Promise<number> {
        const where: any = {
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

    private async sumOptionsOrdersInBase(orders: OpenOrder[], underlying: number, right: OptionType): Promise<number> {
        let result = 0;
        for (const order of orders) {
            await Option.findOne(
                {
                    where: {
                        id: order.contract.id,
                        stock_id: underlying,
                        callOrPut: right,
                    },
                },
            ).then((opt) => Currency.findOne({
                where: {
                    base: this.portfolio.baseCurrency,
                    currency: order.contract.currency,
                },
            }).then((currency) => {
                if (opt !== null) result += order.remainingQty * opt.multiplier * opt.strike / currency.rate;
            }));
        }
        return result;
    }

    protected getOptionOrdersValueInBase(underlying: number, right: OptionType, actionType: OrderAction): Promise<number> {
        if ((this.portfolio !== null) && (underlying !== null)) {
            return OpenOrder.findAll({
                where: {
                    portfolio_id: this.portfolio.id,
                    actionType: actionType,
                    status: ["Submitted", "PreSubmitted"],
                },
                include: {
                    model: Contract,
                    where: {
                        secType: "OPT",
                    },
                }
            }).then((orders: OpenOrder[]) => this.sumOptionsOrdersInBase(orders, underlying, right as OptionType));
        } else {
            return Promise.resolve(0);
        }
    }

    private async sumOptionsOrdersQuantity(orders: OpenOrder[], underlying: Contract, right: OptionType): Promise<number> {
        let result = 0;
        for (const order of orders) {
            await Option.findOne(
                {
                    where: {
                        id: order.contract.id,
                        stock_id: underlying.id,
                        callOrPut: right,
                    },
                },
            ).then((opt) => {
                if (opt !== null) result += order.remainingQty * opt.multiplier;
            });
        }
        return result;
    }

    protected getOptionsOrdersQuantity(underlying: Contract, right: OptionType, actionType: OrderAction): Promise<number> {
        if (underlying !== null) {
            return OpenOrder.findAll({
                where: {
                    portfolio_id: this.portfolio.id,
                    actionType: actionType,
                    status: ["Submitted", "PreSubmitted"],
                },
                include: {
                    model: Contract,
                    where: {
                        secType: "OPT",
                    },
                }
            }).then((orders: OpenOrder[]) => this.sumOptionsOrdersQuantity(orders, underlying, right as OptionType));
        } else {
            return Promise.resolve(0);
        }
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
                }, { quantity: 0, currency: "EUR" }).quantity;
            });
    }

    protected static formatOptionName(ibContract: IbContract): string {
        const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        const month = months[parseInt(ibContract.lastTradeDateOrContractMonth.substring(4, 6)) - 1];
        const day = ibContract.lastTradeDateOrContractMonth.substring(6, 8);
        const year = ibContract.lastTradeDateOrContractMonth.substring(2, 4);
        const datestr: string = day + month + year;
        // const strike = ibContract.strike.toFixed(1); // not good, new AMZN have two decimals
        const name = `${ibContract.symbol} ${datestr} ${ibContract.strike} ${ibContract.right}`;
        // console.log("formatOptionName", name);
        return name;
    }

    protected async findOrCreateContract(ibContract: IbContract): Promise<Contract> {
        let contract: Contract = null;
        // find contract by ib id
        if (ibContract.conId) {
            contract = await Contract.findOne({ where: { conId: ibContract.conId }, });
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
                        this.error(`findOrCreateContract failed for ${ibContract.symbol} with error #${err.code}: '${err.error.message}'`);
                        this.printObject(ibContract);
                        throw err;
                    });
            }
            if (details && (ibContract.secType == SecType.STK)) {
                const defaults = {
                    conId: ibContract.conId,
                    secType: ibContract.secType,
                    symbol: ibContract.symbol,
                    currency: ibContract.currency,
                    exchange: ibContract.primaryExch || ibContract.exchange,
                    name: undefined,
                };
                if (details) defaults.name = details.longName;
                contract = await Contract.findOrCreate({
                    where: {
                        secType: defaults.secType,
                        symbol: defaults.symbol,
                        currency: defaults.currency,
                    },
                    defaults: defaults,
                }).then(([contract, created]) => {
                    if (created) {
                        return Stock.create({
                            id: contract.id,
                        }).then(() => contract);
                    } else {
                        return Contract.update({ values: defaults }, { where: { id: contract.id }, })
                            .then(() => contract);
                    }
                });
            } else if (details && (ibContract.secType == SecType.OPT)) {
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
                    strike: ibContract.strike,
                    callOrPut: ibContract.right,
                    multiplier: ibContract.multiplier,
                };
                const underlying = {    // option underlying contract
                    conId: details.underConId,
                    secType: details.underSecType,
                    symbol: details.underSymbol,
                    currency: ibContract.currency,
                };
                // this.printObject(ibContract);
                // this.printObject(details);
                // this.printObject(underlying);
                contract = await this.findOrCreateContract(underlying)
                    .then((stock) => {
                        opt_values.stock_id = stock.id;
                        return Option.findOne({
                            where: {
                                stock_id: opt_values.stock_id,
                                lastTradeDate: opt_values.lastTradeDate,
                                strike: opt_values.strike,
                                callOrPut: opt_values.callOrPut,
                            },
                        }).then((option) => {
                            if (option) {
                                // update
                                opt_values.id = option.id;
                                return Contract.update({ values: contract_values }, { where: { id: option.id }, })
                                    .then(() => Option.update({ values: opt_values }, { where: { id: option.id }, }))
                                    .then(() => Contract.findByPk(option.id));
                            } else {
                                return Contract.create(contract_values, { logging: false, })
                                    .then((contract) => {
                                        opt_values.id = contract.id;
                                        this.printObject(contract_values);
                                        this.printObject(opt_values);
                                        return Option.create(opt_values, { logging: false, })
                                            .then(() => contract);
                                    });
                            }
                        });
                    });
            } else if (details && (ibContract.secType == SecType.CASH)) {
                const defaults: any = {
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
                }).then(([contract, created]) => {
                    if (created) {
                        return Cash.create({ id: contract.id, }).then(() => contract);
                    } else {
                        return Contract.update({ values: defaults }, { where: { id: contract.id }, })
                            .then(() => contract);
                    }
                });
            } else if (ibContract.secType == SecType.BAG) {
                // not yet refactored
                contract = await Contract.create({
                    conId: ibContract.conId,
                    secType: ibContract.secType,
                    symbol: `${ibContract.tradingClass}-${ibContract.localSymbol}`,
                    currency: ibContract.currency,
                    exchange: ibContract.exchange,
                }).then((contract) => Bag.create({
                    id: contract.id,
                }).then(async () => {
                    const p: Promise<Contract>[] = [];
                    for (const leg of ibContract.comboLegs) {
                        p.push(this.findOrCreateContract({ conId: leg.conId, }));
                    }
                    await Promise.all(p);
                    return contract;
                }));
            } else {
                // IB contract doesn't exists
                this.error(`findOrCreateContract failed for ${ibContract.symbol}: can't find corresponding IB contract data`);
            }
        }
        // this.printObject(contract);
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
