import { EventEmitter } from 'events';
import { Subscription } from "rxjs";
import { QueryTypes } from 'sequelize';
import {
  Contract as IbContract,
  IBApiNext,
  IBApiNextError,
  BarSizeSetting,
  SecType,
  ContractDetails,
  OptionType,
  Bar,
  TickType,
} from "@stoqey/ib";
import { TickType as IBApiTickType } from "@stoqey/ib/dist/api/market/tickType";
import { SecurityDefinitionOptionParameterType, IBApiNextTickType } from "@stoqey/ib/dist/api-next";
import { MutableMarketData } from "@stoqey/ib/dist/core/api-next/api/market/mutable-market-data";
import { IBApiNextApp } from "@stoqey/ib/dist/tools/common/ib-api-next-app";
import { sequelize, Contract, Stock, Option } from "../models";
import { ITradingBot } from '.';

require('dotenv').config();

/** Default group if no -group argument is on command line. */
const DEFAULT_GROUP = "All";

/** Default tags if no -tags argument is on command line. */
const DEFAULT_TAGS = "";
// const DEFAULT_TAGS = "NetLiquidation,TotalCashValue,GrossPositionValue";

export class AccountBot implements ITradingBot {

    protected app: IBApiNextApp;
    protected api: IBApiNext;

    /** The [[Subscription]] on the account summary. */
    private subscription$: Subscription;
  
    constructor(app: IBApiNextApp, api: IBApiNext) {
      this.app = app;
      this.api = api;
    };
    
    public start(): void {
        this.subscription$ = this.api
        .getAccountSummary(
          DEFAULT_GROUP,
          DEFAULT_TAGS
        )
        .subscribe({
          next: (summaries) => {
            this.app.printObject(summaries);
          },
          error: (err: IBApiNextError) => {
            this.app.error(`getAccountSummary failed with '${err.error.message}'`);
          },
        });
      };

    public stop(): void {
        this.subscription$?.unsubscribe();
    };

}