import { IBApiNextError, OpenOrder as IbOpenOrder, Position as IbPosition, OrderAction, SecType } from "@stoqey/ib";
import { Subscription } from "rxjs";
import { Op, Transaction } from "sequelize";
import { ITradingBot } from ".";
import logger, { LogLevel } from "../logger";
import { Balance, Contract, OpenOrder, Position } from "../models";

const MODULE = "AccountBot";

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unused-vars
const sequelize_logging = (...args: any[]): void => logger.trace(MODULE + ".squelize", ...args);

export class AccountUpdateBot extends ITradingBot {
  private orderq: IbOpenOrder[] = [];
  private qProcessing = 0;
  private positionq: IbPosition[] = [];
  private cashq: { currency: string; balance: number }[] = [];

  private ordersSubscription$: Subscription;
  private positionsSubscription$: Subscription;
  private accountSubscription$: Subscription;

  public enqueueOrder(item: IbOpenOrder): void {
    const orderIndex = this.orderq.findIndex((p) => p.order.permId == item.order.permId);
    if (orderIndex !== -1) {
      this.orderq.splice(orderIndex, 1);
    }
    this.orderq.push(item);
    setTimeout(() => this.emit("processQueue"), 100);
  }

  public enqueuePosition(item: IbPosition): void {
    const itemIndex = this.positionq.findIndex((p) => p.contract.conId == item.contract.conId);
    if (itemIndex !== -1) {
      this.positionq.splice(itemIndex, 1);
    }
    this.positionq.push(item);
    setTimeout(() => this.emit("processQueue"), 100);
  }

  public enqueueCashPostition(currency: string, balance: number): void {
    const cashIndex = this.cashq.findIndex((p) => p.currency == currency);
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
        logger.log(
          LogLevel.Info,
          MODULE + ".processQueue",
          undefined,
          `processOrderQueue ${this.orderq.length} item(s)`,
        );
        const item = this.orderq.shift()!;
        await this.updateOpenOrder(item);
        logger.log(LogLevel.Info, MODULE + ".processQueue", undefined, "processOrderQueue done");
      } else if (this.positionq.length > 0) {
        logger.log(
          LogLevel.Info,
          MODULE + ".processQueue",
          undefined,
          `processPositionQueue ${this.positionq.length} item(s)`,
        );
        const item = this.positionq.shift()!;
        await this.updatePosition(item);
        logger.log(LogLevel.Info, MODULE + ".processQueue", undefined, "processPositionQueue done");
      } else if (this.cashq.length > 0) {
        logger.log(LogLevel.Info, MODULE + ".processQueue", undefined, `processCashQueue ${this.cashq.length} item(s)`);
        const item = this.cashq.shift()!;
        await this.updateCashPosition(item);
        logger.log(LogLevel.Info, MODULE + ".processQueue", undefined, "procesCashQueue done");
      }
      --this.qProcessing;
    }
    if (this.orderq.length > 0 || this.positionq.length > 0 || this.cashq.length > 0)
      setTimeout(() => this.emit("processQueue"), 100);
  }

  private async createAndUpdateLegs(order: IbOpenOrder, transaction: Transaction): Promise<IbOpenOrder> {
    if (order.contract.secType == SecType.BAG) {
      if (!order.contract.comboLegs) {
        logger.error(MODULE + ".createAndUpdateLegs", "BAG comboLegs are missing!", order);
        return Promise.resolve(order);
      }
      return order.contract.comboLegs!.reduce(
        async (p, leg) =>
          p.then(async () =>
            this.findOrCreateContract({ conId: leg.conId }, transaction).then(async (contract) => {
              const where = {
                permId: order.order.permId!,
                portfolioId: this.portfolio.id,
                contractId: contract.id,
              };
              const values = {
                ...where,
                // permId: order.order.permId,
                // portfolioId: this.portfolio.id,
                // contract_id: contract.id,
                actionType: order.order.action == leg.action ? OrderAction.BUY : OrderAction.SELL,
                totalQty: order.order.totalQuantity! * leg.ratio!,
                cashQty: order.order.cashQty ? order.order.cashQty * leg.ratio! : undefined,
                lmtPrice: undefined,
                auxPrice: undefined,
                status: order.orderState.status!,
                remainingQty: order.orderStatus
                  ? order.orderStatus.remaining! * leg.ratio!
                  : order.order.totalQuantity! * leg.ratio!,
                orderId: order.orderId,
                clientId: order.order.clientId!,
              };
              return OpenOrder.findOrCreate({
                where: where,
                defaults: values,
                transaction: transaction,
                // logging: false,
              }).then(async ([open_order, _created]) =>
                open_order
                  .update(values, {
                    transaction: transaction,
                    // logging: false,
                  })
                  .then(() => order),
              );
            }),
          ),
        Promise.resolve(order),
      );
    } else {
      return Promise.resolve(order);
    }
  }

  protected async handleUpdateOpenOrder(order: IbOpenOrder, transaction: Transaction): Promise<void> {
    logger.log(LogLevel.Info, MODULE + ".handleUpdateOpenOrder", undefined, order.order.permId, order.contract.symbol);
    await this.findOrCreateContract(order.contract, transaction).then(async (contract: Contract) => {
      logger.log(LogLevel.Trace, MODULE + ".handleUpdateOpenOrder", contract.symbol, "contract found", contract.id);
      return OpenOrder.findOrCreate({
        where: {
          permId: order.order.permId,
          portfolioId: this.portfolio.id,
        },
        defaults: {
          permId: order.order.permId!,
          portfolioId: this.portfolio.id,
          contractId: contract.id,
          actionType: order.order.action!,
          lmtPrice: order.order.lmtPrice,
          auxPrice: order.order.auxPrice,
          status: order.orderState.status!,
          totalQty: order.order.totalQuantity!,
          cashQty: order.order.cashQty,
          remainingQty: order.orderStatus ? order.orderStatus.remaining! : order.order.totalQuantity!,
          orderId: order.orderId,
          clientId: order.order.clientId!,
        },
        transaction: transaction,
        // logging: console.log,
      })
        .then(async ([open_order, created]) => {
          // console.log("OpenOrder.findOrCreate done");
          if (created) return Promise.resolve(open_order);
          else
            return open_order.update(
              {
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
              { transaction: transaction },
            );
        })
        .then(async () => this.createAndUpdateLegs(order, transaction))
        .then(() =>
          logger.log(
            LogLevel.Trace,
            MODULE + ".handleUpdateOpenOrder",
            undefined,
            order.order.permId,
            order.contract.symbol,
            "done",
          ),
        );
      /* Committed */
    });
  }

  protected async updateOpenOrder(order: IbOpenOrder): Promise<void> {
    logger.log(LogLevel.Info, MODULE + ".updateOpenOrder", undefined, order.order.permId, order.contract.symbol);
    return this.app.sequelize.transaction(async (t) => this.handleUpdateOpenOrder(order, t));

    // // First, we start a transaction from your connection and save it into a variable
    // const t = await this.app.sequelize.transaction();
    // try {
    //   // Then, we do some calls passing this transaction as an option:
    //   await this.handleUpdateOpenOrder(order, t);
    //   // If the execution reaches this line, no errors were thrown.
    //   // We commit the transaction.
    //   await t.commit();
    // } catch (error) {
    //   logger.log(LogLevel.Error, MODULE + ".updateOpenOrder", undefined, error);
    //   // If the execution reaches this line, an error was thrown.
    //   // We rollback the transaction.
    //   await t.rollback();
    // }
  }

  private iterateOpenOrdersForUpdate(orders: IbOpenOrder[]): void {
    for (const order of orders) {
      this.enqueueOrder(order);
    }
  }

  protected async updatePosition(pos: IbPosition): Promise<Position | undefined> {
    logger.log(LogLevel.Trace, MODULE + ".updatePosition", pos.contract.symbol, pos);
    const defaults = {
      portfolio_id: this.portfolio.id,
      quantity: pos.pos,
      cost: pos.avgCost! * pos.pos,
    };
    return this.findOrCreateContract(pos.contract).then(async (contract): Promise<Position | undefined> => {
      if (defaults.quantity) {
        return Position.findOrCreate({
          where: { contract_id: contract.id },
          defaults: { ...defaults, contract_id: contract.id },
        })
          .then(async ([position, created]) => {
            if (created) return position;
            else {
              return position.update(defaults);
            }
          })
          .then(async (position): Promise<Position | undefined> => {
            // update contract price, then return position
            if (pos.marketValue) {
              contract.price = pos.marketValue / pos.pos / (pos.contract.multiplier || 1);
              contract.changed("price", true); // force update
            }
            return contract.save({ logging: undefined }).then(() => position);
          });
      } else {
        return Position.destroy({ where: { portfolio_id: defaults.portfolio_id, contract_id: contract.id } }).then(
          (_count): undefined => undefined,
        );
      }
    });
  }

  protected async updateCashPosition(pos: { currency: string; balance: number }): Promise<Balance> {
    logger.log(LogLevel.Info, MODULE + ".updateCashPosition", undefined, pos.currency, pos.balance);
    const where = {
      portfolio_id: this.portfolio.id,
      currency: pos.currency,
    };
    return Balance.findOrCreate({
      where: where,
      defaults: { ...where, quantity: pos.balance },
    }).then(async ([balance, _created]) => balance.update({ quantity: pos.balance }));
  }

  private async cleanBalances(now: number): Promise<void> {
    return Balance.update(
      {
        quantity: 0,
      },
      {
        where: {
          portfolio_id: this.portfolio.id,
          updatedAt: { [Op.lt]: new Date(now) },
          // [Op.or]: [{ updatedAt: { [Op.lt]: new Date(now) } }, { updatedAt: null }],
        },
        // logging: console.log,
      },
    ).then();
  }

  public processQueueWrapper(): void {
    this.processQueue().catch((error) => console.error(error));
  }

  public async start(): Promise<void> {
    this.on("processQueue", () => this.processQueueWrapper());
    const now = Date.now() - 60 * 1000; // 1 minute
    // console.log(Date.now(), now);
    await this.init();

    await this.api.getAllOpenOrders().then(async (orders) => {
      this.iterateOpenOrdersForUpdate(orders);
      return OpenOrder.destroy({
        where: {
          portfolioId: this.portfolio.id,
          updatedAt: { [Op.lt]: new Date(now) },
          // [Op.or]: [{ updatedAt: { [Op.lt]: new Date(now) } }, { updatedAt: null }],
        },
        // logging: console.log,
      });
    });

    this.ordersSubscription$ = this.api.getOpenOrders().subscribe({
      next: (data) => {
        logger.log(
          LogLevel.Info,
          MODULE + ".getOpenOrders",
          undefined,
          "current",
          data.all.length,
          "added",
          data.added?.length,
          "changed",
          data.changed?.length,
        );
        if (data.added && data.added.length > 0) this.iterateOpenOrdersForUpdate(data.added);
        if (data.changed && data.changed.length > 0) this.iterateOpenOrdersForUpdate(data.changed);
      },
      error: (err: IBApiNextError) => {
        this.app.error(`getOpenOrders failed with '${err.error.message}'`);
      },
      complete: () => {
        console.log("getOpenOrders completed.");
      },
    });

    const init_positions: Position[] = await Position.findAll({
      where: { portfolio_id: this.portfolio.id },
      include: [{ association: "contract" }],
    });
    let positions_inited = false;
    this.positionsSubscription$ = this.api.getPositions().subscribe({
      next: (data) => {
        data.added?.forEach((v, k) => {
          if (k == this.accountNumber) v.forEach((p) => this.enqueuePosition(p));
        });
        data.changed?.forEach((v, k) => {
          if (k == this.accountNumber) v.forEach((p) => this.enqueuePosition(p));
        });
        if (!positions_inited) {
          positions_inited = true;
          // For each position still present in portfolio
          data.all.forEach((v, k) => {
            if (k == this.accountNumber)
              v.forEach((p) => {
                // Remove it from init_positions
                const idx = init_positions.findIndex((item) => item.contract.conId == p.contract.conId);
                if (idx >= 0) init_positions.splice(idx, 1);
              });
          });
          // remaining init_positions can be deleted
          init_positions.forEach((pos) => {
            logger.debug(MODULE + ".start", "delete pos", pos.contract.symbol);
            pos.destroy().catch((err) => logger.error(MODULE + ".start", err));
          });
        }
      },
      error: (err: IBApiNextError) => {
        this.app.error(`getPositions failed with '${err.error.message}'`);
      },
      complete: () => {
        console.log("getPositions completed.");
      },
    });

    // clean balances quantities first as if they are unchanged the updatedAt will be unchanged as well
    this.cleanBalances(now)
      .then(() => {
        this.accountSubscription$ = this.api.getAccountUpdates(this.accountNumber).subscribe({
          next: (data) => {
            if (
              data.added &&
              data.added.value &&
              data.added.value.get(this.accountNumber) &&
              data.added.value.get(this.accountNumber)!.get("TotalCashBalance")
            ) {
              for (const key of data.added.value.get(this.accountNumber)!.get("TotalCashBalance")!.keys()) {
                const balance: number = parseFloat(
                  data.added.value.get(this.accountNumber)!.get("TotalCashBalance")!.get(key)?.value || "0",
                );
                if (key != "BASE") this.enqueueCashPostition(key, balance);
              }
            }
            if (
              data.changed &&
              data.changed.value &&
              data.changed.value.get(this.accountNumber) &&
              data.changed.value.get(this.accountNumber)!.get("TotalCashBalance")
            ) {
              for (const key of data.changed.value.get(this.accountNumber)!.get("TotalCashBalance")!.keys()) {
                const balance: number = parseFloat(
                  data.changed.value.get(this.accountNumber)!.get("TotalCashBalance")!.get(key)?.value || "0",
                );
                // console.log("new cash balance:", key, balance);
                if (key != "BASE") this.enqueueCashPostition(key, balance);
              }
            }
          },
          error: (err: IBApiNextError) => {
            this.app.error(`getAccountUpdates failed with '${err.error.message}'`);
          },
        });
      })
      .catch((error) => console.error("account bot start:", error));
  }

  public stop(): void {
    this.ordersSubscription$?.unsubscribe();
    this.positionsSubscription$?.unsubscribe();
    this.accountSubscription$?.unsubscribe();
  }
}
