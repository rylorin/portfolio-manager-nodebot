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
  Position as IbPosition,
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
  OpenOrder,
  Portfolio,
  Position,
  Cash,
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

export class AccountUpdateBot extends ITradingBot {

    private orderq: IbOpenOrder[] = [];
    private orderqProcessing: number = 0;
    private positionq: IbPosition[] = [];
    private positionqProcessing: number = 0;

    private ordersSubscription$: Subscription;
    private positionsSubscription$: Subscription;

    private portfolio: Portfolio = undefined;
  
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
    
    public enqueuePosition(item: IbPosition): void {
      const itemIndex = this.positionq.findIndex(
        (p) => p.contract.conId == item.contract.conId
      );
      if (itemIndex !== -1) {
        this.positionq.splice(itemIndex, 1);
      }
      this.positionq.push(item);
      // this.processOrderQueue();
      setTimeout(() => this.emit('processPositionQueue'), 100);
    }

    private async processPositionQueue(): Promise<void> {
      if ((this.positionqProcessing < 1) && (this.positionq.length > 0)) {
        console.log(`processPositionQueue ${this.positionq.length} elements`)
        this.positionqProcessing++;
        const item = this.positionq.shift();
        await this.updatePosition(item);
        --this.positionqProcessing;
        console.log('processPositionQueue done')
        // return this.processOrderQueue();
      }
      if (this.positionq.length > 0) setTimeout(() => this.emit('processPositionQueue'), 100);
    }

    private async findOrCreateContract(ibContract: IbContract): Promise<Contract> {
      // find contract by ib id
      let contract: Contract = ibContract.conId ? await Contract.findOne({
          where: { conId: ibContract.conId }
      }) : null;
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
              }).then(() => contract)
            )
          } else {
            // update conId for this contract
            return Contract.update({ conId: ibContract.conId }, { where: { id: contract.id }})
              .then(() => contract)
          }
        } else if (ibContract.secType == SecType.OPT) {
          // find option contract by data
          const lastTradeDate = ITradingBot.expirationToDate(ibContract.lastTradeDateOrContractMonth);
          const stock = await this.findOrCreateContract({
            secType: 'STK' as SecType,
            symbol: ibContract.symbol,
            currency: ibContract.currency,
          });
          contract = await Option.findOne({
            where: {
              stock_id: stock.id,
              lastTradeDate: lastTradeDate,
              strike: ibContract.strike,
              callOrPut: ibContract.right,
            }
          }).then((option) => {
            if (option !== null) {
              return Contract.findByPk(option.id)
                // update ib con id
                .then((contract) => Contract.update({ conId: ibContract.conId }, { where: { id: contract.id }}))
                .then(() => contract);
            } else {
              // Create option contrat
              return Contract.create({
                conId: ibContract.conId,
                secType: ibContract.secType,
                symbol: ibContract.localSymbol,
                currency: ibContract.currency,
                exchange: ibContract.exchange,
              }).then((contract) => Option.create({
                  id: contract.id,
                  stock_id: stock.id,
                  lastTradeDate: lastTradeDate,
                  strike: ibContract.strike,
                  callOrPut: ibContract.right,
                }).then(() => contract)
              )
            }
          })
        } else if (ibContract.secType == SecType.CASH) {
          // create it
          contract = await Contract.create({
            conId: ibContract.conId,
            secType: ibContract.secType,
            symbol: ibContract.localSymbol,
            currency: ibContract.currency,
            name: ibContract.localSymbol,
          }).then((contract) => Cash.create({
            id: contract.id,
          }).then(() => contract)
        )
        } else if (ibContract.secType == SecType.BAG) {
          // create it
          contract = await Contract.create({
            conId: ibContract.conId,
            secType: ibContract.secType,
            symbol: `${ibContract.tradingClass}-${ibContract.localSymbol}`,
            currency: ibContract.currency,
            exchange: ibContract.exchange,
          }) /* we should create a BAG child here .then((contract) => Stock.create({
              id: contract.id,
            }).then(() => {
                  return contract;
            })
          ) */
        }
        this.app.error('findOrCreateContract: contract created, please check results');
        this.app.printObject(ibContract);
      } else {
        // console.log('findOrCreateContract got contract by conId');
      }
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
                portfolioId: this.portfolio.id,
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

    private iterateOpenOrdersForUpdate(orders: IbOpenOrder[]): void {
      for (let order of orders) {
        this.enqueueOrder(order);
      };
    }
    protected async updatePosition(pos: IbPosition): Promise<void> {
      await this.findOrCreateContract(pos.contract)
        .then((contract) => Position.update(
          {
            portfolio_id: this.portfolio.id,
            // contract_id: contract.id,
            quantity: pos.pos,
            cost: pos.avgCost * pos.pos,
          }, {
            where: { contract_id: contract.id }
          })
          .then((result): Promise<any> => {
            if (!result[0] && pos.pos) {
              return Position.create({
                portfolio_id: this.portfolio.id,
                contract_id: contract.id,
                quantity: pos.pos,
                cost: pos.avgCost * pos.pos,
                openDate: new Date(),
              });
            } else {
              return Promise.resolve();
            }
        }))
    }

    private cleanPositions(now: number): void {
      Position.destroy({
        where: {
          portfolio_id: this.portfolio.id,
          [Op.or]: [
            {updatedAt: { [Op.lt]: new Date(now) }},
            {updatedAt: null},
          ]
        },
        // logging: console.log,
      });
    }

    public async start(): Promise<void> {
      this.on('processOrderQueue', this.processOrderQueue);
      this.on('processPositionQueue', this.processPositionQueue);
      const now = Date.now() - 0.01;

      await Portfolio.findOne({
        where: {
          account: this.accountNumber,
        }
      }).then((portfolio) => this.portfolio = portfolio);

      await this.api.getAllOpenOrders().then((orders) => {
        this.iterateOpenOrdersForUpdate(orders);
        return OpenOrder.destroy({
            where: {
              portfolio_id: this.portfolio.id,
              [Op.or]: [
                {updatedAt: { [Op.lt]: new Date(now) }},
                {updatedAt: null},
              ]
            },
            // logging: console.log,
          });
        });

      this.ordersSubscription$ = this.api
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
    
      this.positionsSubscription$ = this.api
        .getPositions()
        .subscribe({
          next: (data) => {
            console.log('got next position event');
            data.added?.forEach((v, k) => {
              // console.log(k, this.accountNumber);
              if (k == this.accountNumber) v.forEach((p) => this.enqueuePosition(p));
            });
            data.changed?.forEach((v, k) => {
              if (k == this.accountNumber) v.forEach((p) => this.enqueuePosition(p));
            });
            console.log('next event done.')
          },
          error: (err: IBApiNextError) => {
              this.app.error(
                  `getPositions failed with '${err.error.message}'`
              );
          },
          complete: () => {
              console.log('getPositions completed.');
          }
      });
      setTimeout(() => this.cleanPositions(now), 5000);      // clean old positions after 5 secs  
    };

    public stop(): void {
        this.ordersSubscription$?.unsubscribe();
        this.positionsSubscription$?.unsubscribe();
    };

}