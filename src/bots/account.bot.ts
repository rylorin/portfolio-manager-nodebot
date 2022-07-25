import { Subscription } from "rxjs";
import { Op } from "sequelize";
import {
  IBApiNextError,
  OpenOrder as IbOpenOrder,
  Position as IbPosition,
} from "@stoqey/ib";
import {
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

  private createLegs(order: IbOpenOrder): Promise<void[]> {
    const promises: Promise<void>[] = [];
    for (const leg of order.contract.comboLegs) {
      // this.printObject(leg);
      promises.push(
        this.findOrCreateContract({ conId: leg.conId })
          .then((contract): Promise<void> => (contract != null) ? OpenOrder.update({
            actionType: (order.order.action == leg.action) ? "BUY" : "SELL",
            totalQty: order.order.totalQuantity * leg.ratio,
            cashQty: order.order.cashQty * leg.ratio,
            lmtPrice: order.order.lmtPrice,
            auxPrice: order.order.auxPrice,
            status: order.orderState.status,
            remainingQty: order.orderStatus?.remaining * leg.ratio,
          }, {
            where: {
              permId: order.order.permId,
              portfolioId: this.portfolio.id,
              contract_id: contract.id,
            },
            // logging: console.log,
          }).then(([affectedCount]): Promise<void> => (affectedCount == 0) ? OpenOrder.create({
            permId: order.order.permId,
            portfolioId: this.portfolio.id,
            contract_id: contract.id,
            actionType: (order.order.action == leg.action) ? "BUY" : "SELL",
            totalQty: order.order.totalQuantity * leg.ratio,
            cashQty: order.order.cashQty * leg.ratio,
            lmtPrice: order.order.lmtPrice,
            auxPrice: order.order.auxPrice,
            status: order.orderState.status,
            remainingQty: order.orderStatus?.remaining * leg.ratio,
            orderId: order.orderId,
            clientId: order.order.clientId,
          }, {
            // logging: console.log,
          }).then(() => Promise.resolve()) : Promise.resolve()) : /* error: leg contract not found! */ Promise.resolve())
      );
    }
    return Promise.all(promises);
  }

  protected async updateOpenOrder(order: IbOpenOrder): Promise<void> {
    // this.printObject(order);
    const contract: Contract = await this.findOrCreateContract(order.contract);
    const result = await OpenOrder.update({
      contract_id: contract.id,
      actionType: order.order.action,
      totalQty: order.order.totalQuantity,
      cashQty: order.order.cashQty,
      lmtPrice: order.order.lmtPrice,
      auxPrice: order.order.auxPrice,
      status: order.orderState.status,
      remainingQty: order.orderStatus?.remaining,
      orderId: order.orderId,
      clientId: order.order.clientId,
    }, {
      where: {
        perm_Id: order.order.permId,
        portfolioId: this.portfolio.id,
      },
      // logging: console.log,
    });
    if (result[0] == 0) {
      // order not existing, create it
      await OpenOrder.create({
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
        orderId: order.orderId,
        clientId: order.order.clientId,
      }, {
        // logging: console.log,
      }
      );
      if (order.contract.secType == "BAG") await this.createLegs(order);
    }
  }

  private iterateOpenOrdersForUpdate(orders: IbOpenOrder[]): void {
    for (const order of orders) {
      this.enqueueOrder(order);
    }
  }

  protected async updatePosition(pos: IbPosition): Promise<void> {
    // this.printObject(pos);
    await this.findOrCreateContract(pos.contract)
      .then((contract) => Position.update(
        {
          portfolio_id: this.portfolio.id,
          quantity: pos.pos,
          cost: pos.avgCost * pos.pos,
        }, {
        where: { contract_id: contract.id }
      })
        .then((result): Promise<Position> => {
          if (!result[0] && pos.pos) {
            return Position.create({
              portfolio_id: this.portfolio.id,
              contract_id: contract.id,
              quantity: pos.pos,
              cost: pos.avgCost * pos.pos,
            });
          } else {
            return Promise.resolve(null as Position);
          }
        }));
  }

  protected async updateCashPosition(pos: { currency: string; balance: number; }): Promise<void> {
    console.log(`updateCashPosition(${pos.currency}, ${pos.balance})`);
    const balance = await Balance.findOne({
      where: {
        portfolio_id: this.portfolio.id,
        currency: pos.currency,
      },
      // logging: console.log,
    });
    if (balance != null) {
      await balance.update({
        quantity: pos.balance,
      }, {
        // logging: console.log,
      });
    } else {
      await Balance.create({
        portfolio_id: this.portfolio.id,
        currency: pos.currency,
        quantity: pos.balance,
      }, {
        // logging: console.log,
      });
    }
  }

  private async cleanPositions(now: number): Promise<[affectedRowCount: number]> {
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
        // logging: console.log,
      });
  }

  private cleanBalances(now: number): Promise<[affectedRowCount: number]> {
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
      });
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