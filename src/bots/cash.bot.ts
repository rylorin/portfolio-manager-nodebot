import { OrderAction } from "@stoqey/ib";
import { QueryTypes, Op } from "sequelize";
import { ITradingBot } from ".";
import {
    Contract,
    Stock,
    Option,
    Position,
    OpenOrder,
    Parameter,
    Portfolio,
    Balance,
} from "../models";

export class CashManagementBot extends ITradingBot {

    private async process(): Promise<void> {
        console.log("CashManagementBot process begin");
        await this.init();  // load parameters
        let extra_cash = 0;
        let units_to_buy = 0;
        let units_to_sell = 0;
        if (this.portfolio.cashStrategy == 0) {
        } else if (this.portfolio.cashStrategy == 1) {
            // manage cash balance
            const currency = this.portfolio.benchmark.currency;
            const balance = await Balance.findOne(
                {
                    where: {
                        portofolio: this.portfolio.id,
                        currency: currency,
                    }
                });
            if (balance.quantity < 0) {
                // we need to sell some benchmark units
                units_to_sell = Math.ceil(-balance.quantity / this.portfolio.benchmark.price);
            } else if (balance.quantity > this.portfolio.benchmark.price) {
                // we can buy some benchmark units
                units_to_buy = Math.floor(balance.quantity / this.portfolio.benchmark.price);
            }
        } else if (this.portfolio.cashStrategy == 2) {
            // options value: cash needed to close all options positions

        } else if (this.portfolio.cashStrategy == 3) {
            // option risk: cash to cover options risk

        }
        const benchmark_on_buy = await this.getContractOrdersQuantity(this.portfolio.benchmark, OrderAction.BUY);
        const benchmark_on_sell = await this.getContractOrdersQuantity(this.portfolio.benchmark, OrderAction.SELL);
        if ((this.portfolio.cashStrategy > 0) && ((benchmark_on_buy - benchmark_on_sell) != (units_to_buy - units_to_sell))) {
            // cancel any pending order
            await OpenOrder.findAll({
                where: {
                    portfolio_id: this.portfolio.id,
                    contract_id: this.portfolio.benchmark.id,
                }
            }).then((orders) => orders.reduce((p, order) => {
                return p.then(() => this.api.cancelOrder(order.orderId));
            }, Promise.resolve()));
            if ((units_to_buy - units_to_sell) < 0) this.api.placeNewOrder(this.portfolio.benchmark, ITradingBot.BenchmarkOrder(OrderAction.SELL, units_to_sell));
            else if ((units_to_buy - units_to_sell) > 0) this.api.placeNewOrder(this.portfolio.benchmark, ITradingBot.BenchmarkOrder(OrderAction.BUY, units_to_buy));
        }
        setTimeout(() => this.emit("process"), 3600 * 1000);    // wait 1 hour
        console.log("CashManagementBot process end");
    }

    public async start(): Promise<void> {
        this.on("process", this.process);
        setTimeout(() => this.emit("process"), 60 * 1000);
    }

}