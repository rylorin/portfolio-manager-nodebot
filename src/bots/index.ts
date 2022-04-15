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
  
export class ITradingBot extends EventEmitter {
    protected app: IBApiNextApp;
    protected api: IBApiNext;
    protected accountNumber: string = undefined;

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

    protected static OptionComboContract(underlying: string, buyleg: number, sellleg: number): IbContract {
        let contract: IbContract = {
            symbol: underlying,
            secType: "BAG" as SecType,
            currency: "USD",
            exchange: "SMART",
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
        contract.comboLegs = [];
        contract.comboLegs.push(leg1);
        contract.comboLegs.push(leg2);
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

};

export { ContractsUpdaterBot } from './updater.bot';
export { AccountUpdateBot } from './account.bot';
export { CashManagementBot } from './cash.bot';
export { SellCoveredCallsBot } from './cc.bot';
export { SellCashSecuredPutBot } from './csp.bot';
export { RollOptionPositionsBot } from './roll.bot';
