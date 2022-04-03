import { EventEmitter } from 'events';
import { Subscription } from "rxjs";
import { QueryTypes, Op } from 'sequelize';
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
  OpenOrder as IbOpenOrder,
} from "@stoqey/ib";
import { TickType as IBApiTickType } from "@stoqey/ib/dist/api/market/tickType";
import { SecurityDefinitionOptionParameterType, IBApiNextTickType } from "@stoqey/ib/dist/api-next";
import { MutableMarketData } from "@stoqey/ib/dist/core/api-next/api/market/mutable-market-data";
import { IBApiNextApp } from "@stoqey/ib/dist/tools/common/ib-api-next-app";
import {
  sequelize,
  Contract,
  Stock,
  Option,
  OpenOrder as OpenOrder
} from "../models";
import { ITradingBot } from '.';

require('dotenv').config();

/** Default group if no -group argument is on command line. */
const DEFAULT_GROUP = "All";

/** Default tags if no -tags argument is on command line. */
const DEFAULT_TAGS = "";
// const DEFAULT_TAGS = "NetLiquidation,TotalCashValue,GrossPositionValue";

const serialize = (fn: any) => {
  let queue = Promise.resolve();
  return (...args: any[]) => {
    const res = queue.then(() => fn(...args));
    queue = res.catch(() => {});
    return res;
  };
};

// class QueulizeX {
//   private callback: (arg0: any) => any;
//   private items: any[] = [];
//   private running = 0;

//   constructor(fn) {
//     this.callback = fn;
//   }

//   public enqueue(item: any) {
//     let found = false;
//     for (let i in this.items) {
//       if (i == item) found = true;
//     }
//     if (!found) this.items.push(item);
//     this.process();
//   }
  
//   public dequeue(): any {
//     return this.items.shift();
//   }

//   private async process(): Promise<void> {
//     if (this.running < 1) {
//       this.running++;
//       const item = this.dequeue();
//       await this.callback(item);
//       --this.running;
//       return this.process();
//     }
//   }

// }

export class AccountBot extends EventEmitter implements ITradingBot {

    protected app: IBApiNextApp;
    protected api: IBApiNext;
    private orderq: IbOpenOrder[] = [];
    private orderqProcessing: number = 0;

    /** The [[Subscription]] on the account summary. */
    private subscription$: Subscription;
  
    constructor(app: IBApiNextApp, api: IBApiNext) {
      super();
      this.app = app;
      this.api = api;
    };

    private expirationToDate(lastTradeDateOrContractMonth: string): Date {
      const lastTradeDate = new Date(
        parseInt(lastTradeDateOrContractMonth.substring(0, 4)),
        parseInt(lastTradeDateOrContractMonth.substring(4, 6)) - 1,
        parseInt(lastTradeDateOrContractMonth.substring(6, 8)),
        16,
        30
      );
      return lastTradeDate;
    }

    public enqueueOrder(item: IbOpenOrder): void {
      const orderIndex = this.orderq.findIndex(
        (p) => p.order.permId == item.order.permId
      );
      if (orderIndex !== -1) {
        this.orderq.splice(orderIndex, 1);
      }
      this.orderq.push(item);
      // this.processOrderQueue();
      setTimeout(() => this.emit('processOrderQueue'), 100);
    }

    private async processOrderQueue(): Promise<void> {
      if ((this.orderqProcessing < 1) && (this.orderq.length > 0)) {
        console.log(`processOrderQueue ${this.orderq.length} elements`)
        this.orderqProcessing++;
        const item = this.orderq.shift();
        await this.updateOpenOrder(item);
        --this.orderqProcessing;
        console.log('processOrderQueue done')
        // return this.processOrderQueue();
      }
      if (this.orderq.length > 0) setTimeout(() => this.emit('processOrderQueue'), 100);
    }
    
    private async findOrCreateContract(ibContract: IbContract): Promise<Contract> {
      // find contract by ib id
      let contract: Contract = await Contract.findOne({
          where: { conId: ibContract.conId }
      });
      if (contract === null) {  // not found
        if (ibContract.secType == SecType.STK) {
          // find stock contract by data
          contract = await Contract.findOne({
            where: {
              secType: 'STK',
              symbol: ibContract.symbol,
              currency: ibContract.currency,
            }
          });
          if (contract === null) {
            // not found, create it
            contract = await Contract.create({
              conId: ibContract.conId,
              secType: ibContract.secType,
              symbol: ibContract.symbol,
              currency: ibContract.currency,
              exchange: ibContract.exchange,
            }).then((contract) => Stock.create({
                id: contract.id,
              }).then(() => {
                    return contract;
              })
            )
          } else {
            // update conId for this contract
            return Contract.update({ conId: ibContract.conId }, { where: { id: contract.id }})
              .then(() => contract)
          }
        } else if (ibContract.secType == SecType.OPT) {
          const stock = await this.findOrCreateContract({
            secType: 'STK' as SecType,
            symbol: ibContract.symbol,
            currency: ibContract.currency,
          });
          // find option contract by data
          const lastTradeDate = this.expirationToDate(ibContract.lastTradeDateOrContractMonth);
          let option = await Option.findOne({
            where: {
              stock_id: stock.id,
              lastTradeDate: lastTradeDate,
              strike: ibContract.strike,
              callOrPut: ibContract.right,
            }
          });
          if (option !== null) {
            contract = await Contract.findByPk(option.id)
              // update ib con id
              .then((contract) => Contract.update({ conId: ibContract.conId }, { where: { id: contract.id }}))
              .then(() => contract);
          } else {
            // Create option contrat
            contract = await Contract.create({
              conId: ibContract.conId,
              secType: ibContract.secType,
              symbol: ibContract.localSymbol,
              currency: ibContract.currency,
              exchange: ibContract.exchange,
            })
            .then((contract) => Option.create({
                id: contract.id,
                stock_id: stock.id,
                lastTradeDate: lastTradeDate,
                strike: ibContract.strike,
                callOrPut: ibContract.right,
            }))
            .then(() => contract)
          }
        } else if (ibContract.secType == SecType.BAG) {
          // create it
          contract = await Contract.create({
            conId: ibContract.conId,
            secType: ibContract.secType,
            symbol: `${ibContract.tradingClass}-${ibContract.localSymbol}`,
            currency: ibContract.currency,
            exchange: ibContract.exchange,
          }) /* we should create a BAD child here .then((contract) => Stock.create({
              id: contract.id,
            }).then(() => {
                  return contract;
            })
          ) */
        }
        this.app.error('contract created, please check results');
        this.app.printObject(ibContract);
      } else {
        console.log('findOrCreateContract got contract by conId');
      }
      // this.app.printObject(contract);
      return contract;
    }
    
    protected updateOpenOrder(order: IbOpenOrder): Promise<void> {
        // console.log('updateOpenOrders', order.order.permId);
        return OpenOrder.update({
          actionType: order.order.action,
          totalQty: order.order.totalQuantity,
          cashQty: order.order.cashQty,
          lmtPrice: order.order.lmtPrice,
          auxPrice: order.order.auxPrice,
          status: order.orderState.status,
          remainingQty: order.orderStatus?.remaining,
        },{
          where: { perm_Id: order.order.permId },
          // logging: console.log,
        }).then((result) => {
          if (result[0] == 0) {
            // order not existing, create it
            return this.findOrCreateContract(order.contract)
            // .then((contract) => {
            //   this.app.printObject(contract);
            //   return contract
            // })
            .then((contract) =>
              OpenOrder.create({
                permId: order.order.permId,
                accountId: 26,
                contract_id: contract.id,
                actionType: order.order.action,
                totalQty: order.order.totalQuantity,
                cashQty: order.order.cashQty,
                lmtPrice: order.order.lmtPrice,
                auxPrice: order.order.auxPrice,
                status: order.orderState.status,
                remainingQty: order.orderStatus?.remaining,
              },{
                // logging: console.log,
              })
            ).then(() => Promise.resolve());
          } else {
            return Promise.resolve();
          }
        })
    }

/*
     private iterateOpenOrdersForUpdate(orders: IbOpenOrder[]): Promise<void> {
      return orders.reduce((p, order) => {
        return p.then(() => this.updateOpenOrder(order))
      }, Promise.resolve()); // initial
    }
 */  
    private iterateOpenOrdersForUpdate(orders: IbOpenOrder[]): void {
      for (let order of orders) {
        this.enqueueOrder(order);
      };
    }

    public async start(): Promise<void> {

      const now = Date.now();
      this.on('processOrderQueue', this.processOrderQueue);
      await this.api.getAllOpenOrders().then((orders) => {
        this.iterateOpenOrdersForUpdate(orders);
        return OpenOrder.destroy({
            where: {
              account_id: 26,
              updatedAt: { [Op.lt]: new Date(now - 0.1) }
            },
            // logging: console.log,
          });
        });

      this.subscription$ = this.api
        .getOpenOrders()
        .subscribe({
            next: (data) => {
                console.log('got next event', data.all.length, 'open orders');
                console.log(`${data.added?.length} orders added, ${data.changed?.length} changed`);
                if (data.added?.length > 0) this.iterateOpenOrdersForUpdate(data.added);
                if (data.changed?.length > 0) this.iterateOpenOrdersForUpdate(data.changed);
                console.log('next event done.')
            },
            error: (err: IBApiNextError) => {
                this.app.error(
                    `getOpenOrders failed with '${err.error.message}'`
                );
            },
            complete: () => {
                console.log('getOpenOrders completed.');
            }
        });
        // setTimeout(() => this.emit('processOrderQueue'), 1000);
    
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