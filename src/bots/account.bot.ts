import { Subscription } from "rxjs";
import { Op, Transaction } from "sequelize";
import {
  IBApiNextError,
  OpenOrder as IbOpenOrder,
  Position as IbPosition,
  SecType,
} from "@stoqey/ib";
import {
  sequelize,
  Contract,
  OpenOrder,
  Position,
  Balance,
} from "../models";
import { ITradingBot } from ".";

export class AccountUpdateBot extends ITradingBot {

  private orderq: IbOpenOrder[] = [];
  private qProcessing = 0;
  private positionq: IbPosition[] = [];
  private cashq: { currency: string, balance: number }[] = [];

  private ordersSubscription$: Subscription;
  private positionsSubscription$: Subscription;
  private accountSubscription$: Subscription;

  public enqueueOrder(item: IbOpenOrder): void {
    const orderIndex = this.orderq.findIndex(
      (p) => p.order.permId == item.order.permId
    );
    if (orderIndex !== -1) {
      this.orderq.splice(orderIndex, 1);
    }
    this.orderq.push(item);
    setTimeout(() => this.emit("processQueue"), 100);
  }

  public enqueuePosition(item: IbPosition): void {
    const itemIndex = this.positionq.findIndex(
      (p) => p.contract.conId == item.contract.conId
    );
    if (itemIndex !== -1) {
      this.positionq.splice(itemIndex, 1);
    }
    this.positionq.push(item);
    setTimeout(() => this.emit("processQueue"), 100);
  }

  public enqueueCashPostition(currency: string, balance: number): void {
    const cashIndex = this.cashq.findIndex(
      (p) => p.currency == currency
    );
    if (cashIndex !== -1) {
      this.cashq.splice(cashIndex, 1);
    }
    this.cashq.push({ currency, balance });
    setTimeout(() => this.emit("processQueue"), 100);
  }

  private async processQueue(): Promise<void> {
    if (this.qProcessing < 1) {
      this.qProcessing++;
      if (this.orderq.length > 0) {
        console.log(`processOrderQueue ${this.orderq.length} item(s)`);
        const item = this.orderq.shift();
        await this.updateOpenOrder(item);
        console.log("processOrderQueue done");
      } else if (this.positionq.length > 0) {
        console.log(`processPositionQueue ${this.positionq.length} item(s)`);
        const item = this.positionq.shift();
        await this.updatePosition(item);
        console.log("processPositionQueue done");
      } else if (this.cashq.length > 0) {
        console.log(`processCashQueue ${this.cashq.length} item(s)`);
        const item = this.cashq.shift();
        await this.updateCashPosition(item);
        console.log("procesCashQueue done");
      }
      --this.qProcessing;
    }
    if ((this.orderq.length > 0) || (this.positionq.length > 0) || (this.cashq.length > 0)) setTimeout(() => this.emit("processQueue"), 100);
  }

  private createAndUpdateLegs(order: IbOpenOrder, transaction: Transaction): Promise<IbOpenOrder> {
    if (order.contract.secType == SecType.BAG) {
      return order.contract.comboLegs.reduce((p, leg) => p.then(() =>
        this.findOrCreateContract({ conId: leg.conId }, transaction)
          .then((contract) => {
            const where = {
              permId: order.order.permId,
              portfolioId: this.portfolio.id,
              contract_id: contract.id,
            };
            const values = {
              // permId: order.order.permId,
              // portfolioId: this.portfolio.id,
              // contract_id: contract.id,
              actionType: (order.order.action == leg.action) ? "BUY" : "SELL",
              totalQty: order.order.totalQuantity * leg.ratio,
              cashQty: order.order.cashQty * leg.ratio,
              lmtPrice: undefined,
              auxPrice: undefined,
              status: order.orderState.status,
              remainingQty: order.orderStatus?.remaining * leg.ratio,
              orderId: order.orderId,
              clientId: order.order.clientId,
            };
            return OpenOrder.findOrCreate({ where: where, defaults: values, transaction: transaction, logging: console.log, })
              .then(([open_order, created]) => open_order.update(values, { transaction: transaction, logging: console.log, })
                .then(() => order));
          })), Promise.resolve(order));
    } else {
      return Promise.resolve(order);
    }
  }

  protected updateOpenOrder(order: IbOpenOrder): Promise<void> {
    // this.printObject(order);
    console.log("updateOpenOrder", order.order.permId, order.contract.symbol);
    try {
      return this.findOrCreateContract(order.contract)
        .then((contract: Contract) => sequelize.transaction((transaction) => OpenOrder.findOrCreate({
          where: {
            perm_Id: order.order.permId,
            portfolioId: this.portfolio.id,
          },
          defaults: {
            permId: order.order.permId,
            portfolioId: this.portfolio.id,
            contract_id: contract.id,
            actionType: order.order.action,
            lmtPrice: order.order.lmtPrice,
            auxPrice: order.order.auxPrice,
            status: order.orderState.status,
            totalQty: order.order.totalQuantity,
            cashQty: order.order.cashQty,
            remainingQty: order.orderStatus?.remaining,
            orderId: order.orderId,
            clientId: order.order.clientId,
          },
          transaction: transaction,
          // logging: console.log,
        })
          .then(([open_order, created]) => open_order.update({
            // contract_id: contract.id,  // contract is not supposed to change
            actionType: order.order.action,
            lmtPrice: order.order.lmtPrice,
            auxPrice: order.order.auxPrice,
            status: order.orderState.status,
            totalQty: order.order.totalQuantity,
            cashQty: order.order.cashQty,
            remainingQty: order.orderStatus?.remaining,
            orderId: order.orderId,
            clientId: order.order.clientId,
          }, { transaction: transaction, }))
          .then(() => this.createAndUpdateLegs(order, transaction))
          .then()
         /* Committed */));
    } catch (err) {
      // Rolled back
      console.error(err);
    }
  }

  private iterateOpenOrdersForUpdate(orders: IbOpenOrder[]): void {
    for (const order of orders) {
      this.enqueueOrder(order);
    }
  }

  protected updatePosition(pos: IbPosition): Promise<Position> {
    // this.printObject(pos);
    const defaults = {
      portfolio_id: this.portfolio.id,
      quantity: pos.pos,
      cost: pos.avgCost * pos.pos,
    };
    return this.findOrCreateContract(pos.contract)
      .then((contract) => Position.findOrCreate({ where: { contract_id: contract.id }, defaults: defaults, })
        .then(([position, created]) => position.update(defaults)));
  }

  protected updateCashPosition(pos: { currency: string; balance: number; }): Promise<Balance> {
    console.log(`updateCashPosition(${pos.currency}, ${pos.balance})`);
    const where = {
      portfolio_id: this.portfolio.id,
      currency: pos.currency,
    };
    return Balance.findOrCreate({ where: where, defaults: { quantity: pos.balance, }, })
      .then(([balance, created]) => balance.update({ quantity: pos.balance, }));
  }

  private cleanPositions(now: number): Promise<void> {
    return Position.update(
      {
        quantity: 0,
      },
      {
        where: {
          portfolio_id: this.portfolio.id,
          [Op.or]: [
            { updatedAt: { [Op.lt]: new Date(now) } },
            { updatedAt: null },
          ]
        },
        logging: console.log,
      }).then();
  }

  private cleanBalances(now: number): Promise<void> {
    return Balance.update(
      {
        quantity: 0,
      },
      {
        where: {
          portfolio_id: this.portfolio.id,
          [Op.or]: [
            { updatedAt: { [Op.lt]: new Date(now) } },
            { updatedAt: null },
          ]
        },
        // logging: console.log,
      }).then();
  }

  public async start(): Promise<void> {
    this.on("processQueue", this.processQueue);
    const now = Date.now() - (60 * 1000); // 1 minute
    // console.log(Date.now(), now);
    await this.init();

    await this.api.getAllOpenOrders().then((orders) => {
      this.iterateOpenOrdersForUpdate(orders);
      return OpenOrder.destroy({
        where: {
          portfolio_id: this.portfolio.id,
          [Op.or]: [
            { updatedAt: { [Op.lt]: new Date(now) } },
            { updatedAt: null },
          ]
        },
        // logging: console.log,
      });
    });

    this.ordersSubscription$ = this.api
      .getOpenOrders()
      .subscribe({
        next: (data) => {
          console.log("got next event", data.all.length, "open orders");
          console.log(`${data.added?.length} orders added, ${data.changed?.length} changed`);
          if (data.added?.length > 0) this.iterateOpenOrdersForUpdate(data.added);
          if (data.changed?.length > 0) this.iterateOpenOrdersForUpdate(data.changed);
        },
        error: (err: IBApiNextError) => {
          this.app.error(
            `getOpenOrders failed with '${err.error.message}'`
          );
        },
        complete: () => {
          console.log("getOpenOrders completed.");
        }
      });

    this.positionsSubscription$ = this.api
      .getPositions()
      .subscribe({
        next: (data) => {
          data.added?.forEach((v, k) => {
            if (k == this.accountNumber) v.forEach((p) => this.enqueuePosition(p));
          });
          data.changed?.forEach((v, k) => {
            if (k == this.accountNumber) v.forEach((p) => this.enqueuePosition(p));
          });
        },
        error: (err: IBApiNextError) => {
          this.app.error(
            `getPositions failed with '${err.error.message}'`
          );
        },
        complete: () => {
          console.log("getPositions completed.");
        }
      });

    // clean balances quantities first as if they are unchanged the updatedAt will be unchanged as well
    await this.cleanBalances(now);
    this.accountSubscription$ = this.api.getAccountUpdates(this.accountNumber).subscribe({
      next: (data) => {
        // this.printObject(data);
        if (data.added?.value && data.added?.value?.get(this.accountNumber) && data.added?.value?.get(this.accountNumber).get("TotalCashBalance")) {
          for (const key of data.added?.value?.get(this.accountNumber).get("TotalCashBalance").keys()) {
            const balance: number = parseFloat(data.added?.value?.get(this.accountNumber).get("TotalCashBalance").get(key).value);
            if (key != "BASE") this.enqueueCashPostition(key, balance);
          }
        }
        if (data.changed?.value && data.changed?.value?.get(this.accountNumber) && data.changed?.value?.get(this.accountNumber).get("TotalCashBalance")) {
          for (const key of data.changed?.value?.get(this.accountNumber).get("TotalCashBalance").keys()) {
            const balance: number = parseFloat(data.changed?.value?.get(this.accountNumber).get("TotalCashBalance").get(key).value);
            // console.log("new cash balance:", key, balance);
            if (key != "BASE") this.enqueueCashPostition(key, balance);
          }
        }
      },
    });

    setTimeout(() => this.cleanPositions(now), 15 * 1000);      // clean old positions after 15 secs  
  }

  public stop(): void {
    this.ordersSubscription$?.unsubscribe();
    this.positionsSubscription$?.unsubscribe();
    this.accountSubscription$?.unsubscribe();
  }

}