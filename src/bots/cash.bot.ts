import { OptionType, OrderAction } from "@stoqey/ib";
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
        const benchmark = this.portfolio.benchmark;
        const benchmark_value = await this.getContractPositionValueInBase(benchmark);
        let balance_in_base: number;
        await Balance.findAll({ where: { portfolio_id: this.portfolio.id, }, })
            .then((balances) => {
                balance_in_base = balances.reduce((p, b) => {
                    p.quantity += b.quantity / this.base_rates[b.currency];
                    return p;
                }, { quantity: 0, currency: "EUR" }).quantity;
            });
        let benchmark_balance_in_base: number;
        await Balance.findOne(
            {
                where: {
                    portfolio_id: this.portfolio.id,
                    currency: benchmark.currency,
                }
            }).then((balance) => {
                benchmark_balance_in_base = balance.quantity / this.base_rates[balance.currency];
            });
        let extra_cash: number;
        if (this.portfolio.cashStrategy == 0) {
            extra_cash = 0;
        } else if (this.portfolio.cashStrategy == 1) {
            // manage cash balance
            extra_cash = benchmark_balance_in_base;
        } else if (this.portfolio.cashStrategy == 2) {
            // options value: cash needed to close all options positions
            let opt_value = await this.getOptionPositionsValueInBase(null, null);
            opt_value = Math.max(opt_value, 0);
            extra_cash = balance_in_base - opt_value;
        } else if (this.portfolio.cashStrategy == 3) {
            // option risk: cash to cover options risk
            let opt_value = await this.getOptionPositionsRiskInBase(null, OptionType.Put);
            opt_value = Math.max(opt_value, 0);
            extra_cash = balance_in_base - opt_value;
        } else {
            this.error(`unimplemented cash strategy ${this.portfolio.cashStrategy}`);
            extra_cash = 0;
        }

        let units_to_buy = 0;
        let units_to_sell = 0;
        if (extra_cash < 0) {
            // we need to sell some benchmark units
            if (-extra_cash > benchmark_balance_in_base) extra_cash = -benchmark_balance_in_base;
            units_to_sell = Math.ceil(-extra_cash / benchmark.price);
        } else if (extra_cash > benchmark.price) {
            // we can buy some benchmark units
            if (extra_cash > benchmark_balance_in_base) extra_cash = benchmark_balance_in_base;
            units_to_buy = Math.floor(extra_cash / benchmark.price);
        }
        const benchmark_on_buy = await this.getContractOrdersQuantity(benchmark, OrderAction.BUY);
        const benchmark_on_sell = await this.getContractOrdersQuantity(benchmark, OrderAction.SELL);
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
            if ((units_to_buy - units_to_sell) < 0) await this.api.placeNewOrder(benchmark, ITradingBot.BenchmarkOrder(OrderAction.SELL, units_to_sell));
            else if ((units_to_buy - units_to_sell) > 0) await this.api.placeNewOrder(benchmark, ITradingBot.BenchmarkOrder(OrderAction.BUY, units_to_buy));
        }
        setTimeout(() => this.emit("process"), 3600 * 1000);    // wait 1 hour
        console.log("CashManagementBot process end");
    }

    public async start(): Promise<void> {
        this.on("process", this.process);
        setTimeout(() => this.emit("process"), 60 * 1000);
    }

}