import { IBApiNext } from '@stoqey/ib';
import { IBApiNextApp } from '@stoqey/ib/dist/tools/common/ib-api-next-app';
import EventEmitter from 'events';

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

    protected static expirationToDate(lastTradeDateOrContractMonth: string): Date {
        const lastTradeDate = new Date(
            parseInt(lastTradeDateOrContractMonth.substring(0, 4)),
            parseInt(lastTradeDateOrContractMonth.substring(4, 6)) - 1,
            parseInt(lastTradeDateOrContractMonth.substring(6, 8)),
        );
        return lastTradeDate;
    }
  
}

export { ContractsUpdaterBot } from './updater.bot';
export { AccountUpdateBot } from './account.bot';
export { CashManagementBot } from './cash.bot';
export { SellCoveredCallsBot } from './cc.bot';
export { SellCashSecuredPutBot } from './csp.bot';
export { RollOptionPositionsBot } from './roll.bot';
