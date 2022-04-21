import { IBApiNextApp } from '@stoqey/ib/dist/tools/common/ib-api-next-app';
import EventEmitter from 'events';
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
      };

    public start(): void {};

    public stop(): void {};

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
        const lastTradeDate = new Date(
            parseInt(lastTradeDateOrContractMonth.substring(0, 4)),
            parseInt(lastTradeDateOrContractMonth.substring(4, 6)) - 1,
            parseInt(lastTradeDateOrContractMonth.substring(6, 8)),
        );
        return lastTradeDate;
    }

    protected static OptionComboContract(underlying: Contract, buyleg: number, sellleg: number): IbContract {
        let contract: IbContract = {
            symbol: underlying.symbol,
            secType: "BAG" as SecType,
            currency: underlying.currency,
            exchange: (underlying.currency == 'USD') ? 'SMART' : (underlying.exchange ?? 'SMART'),
        };
        let leg1: ComboLeg = {
            conId: buyleg,
            ratio: 1,
            action: "BUY",
            exchange: "SMART",
        };
        let leg2: ComboLeg = {
            conId: sellleg,
            ratio: 1,
            action: "SELL",
            exchange: "SMART",
        };
        contract.comboLegs = [ leg1, leg2];
        return contract;
    }

    protected static CspContract(underlying: Option): IbContract {
        const expiry = new Date(underlying.lastTradeDate);
        let contract: IbContract = {
            secType: underlying.contract.secType as SecType,
            symbol: underlying.stock.contract.symbol,
            currency: underlying.contract.currency,
            exchange: underlying.contract.exchange ?? 'SMART',
            conId: underlying.contract.conId,
            strike: underlying.strike,
            right: underlying.callOrPut,
            lastTradeDateOrContractMonth: expiry.toISOString().substring(0,10).replaceAll('-', ''),
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
        }
        return order;
    }

    protected static CspOrder(action: OrderAction, quantity: number, limitPrice: number): IbOrder {
        const order: IbOrder = {
            action: action,
            orderType: OrderType.LMT,
            totalQuantity: quantity,
            lmtPrice: limitPrice,
            transmit: false,
        }
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

    protected getContractPositionValueInBase(benchmark: Contract): Promise<number> {
        if ((this.portfolio !== null) && (benchmark !== null)) {
            return Position.findOne({
                where: {
                    contract_id: benchmark.id,
                },
            }).then((position) => Currency.findOne({
                    where: {
                        base: this.portfolio.baseCurrency,
                        currency: benchmark.currency,
                    },
                }).then((currency) => ((position === null) || (currency === null)) ? 0 : (position.quantity * benchmark.price / currency.rate))
            );
        } else {
            return Promise.resolve(0);
        }
    }

    private async sumOptionsPositionsAmountInBase(positions: Position[], underlying: number, right: OptionType): Promise<number> {
        let result = 0;
        for (const position of positions) {
            const opt = await Option.findOne(
                {
                    where: {
                        id: position.contract.id,
                        callOrPut: right,
                        stock_id: underlying,
                    },
                },
            ).then((opt) => Currency.findOne({
                where: {
                    base: this.portfolio.baseCurrency,
                    currency: position.contract.currency,
                },
            }).then((currency) => {
                if (opt !== null) result += position.quantity * opt.multiplier * opt.strike / currency.rate;
            }));
        }
        return result;
    }

    protected getOptionPositionsValueInBase(underlying: number, right: OptionType): Promise<number> {
        if ((this.portfolio !== null) && (underlying !== null)) {
            return Position.findAll({
                include: {
                    model: Contract,
                    where: {
                        secType: 'OPT',
                    },
                },
            }).then((positions: Position[]) => this.sumOptionsPositionsAmountInBase(positions, underlying, right));
        } else {
            return Promise.resolve(0);
        }
    }

    protected getContractOrderValueInBase(benchmark: Contract, actionType: OrderAction): Promise<number> {
        if ((this.portfolio !== null) && (benchmark !== null)) {
            return OpenOrder.findAll({
                where: {
                    actionType: actionType,
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

    private async sumOptionsOrdersInBase(orders: OpenOrder[], underlying: number, right: OptionType): Promise<number> {
        let result = 0;
        for (const order of orders) {
            const opt = await Option.findOne(
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
                    actionType: actionType,
                },
                include: {
                    model: Contract,
                    where: {
                        secType: 'OPT',
                    },
                }
            }).then((orders: OpenOrder[]) => this.sumOptionsOrdersInBase(orders, underlying, right as OptionType));
        } else {
            return Promise.resolve(0);
        }
    }

};

export { ContractsUpdaterBot } from './updater.bot';
export { AccountUpdateBot } from './account.bot';
export { CashManagementBot } from './cash.bot';
export { SellCoveredCallsBot } from './cc.bot';
export { SellCashSecuredPutBot } from './csp.bot';
export { RollOptionPositionsBot } from './roll.bot';
