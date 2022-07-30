import { OptionType, OrderAction } from "@stoqey/ib";
import { Op } from "sequelize";
import { ITradingBot } from ".";
import {
    OpenOrder,
} from "../models";

export class CashManagementBot extends ITradingBot {

    private async process(): Promise<void> {
        console.log("CashManagementBot process begin");
        await this.init();  // load parameters
        const benchmark = this.portfolio.benchmark;
        const benchmark_value = (await this.getContractPositionValueInBase(benchmark))
            + (await this.getOptionsPositionsRiskInBase(benchmark.id, OptionType.Put));
        const balance_in_base: number = await this.getTotalBalanceInBase();
        const benchmark_balance_in_base: number = await this.getBalanceInBase(benchmark.currency);
        const benchmark_units: number = await this.getContractPosition(benchmark);

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
            let opt_value = await this.getOptionsPositionsRiskInBase(null, OptionType.Put);
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
            if (-extra_cash > benchmark_value) extra_cash = -benchmark_value;
            units_to_sell = Math.min(Math.ceil(-extra_cash / benchmark.livePrice), benchmark_units);
        } else if (extra_cash > benchmark.livePrice) {
            // we can buy some benchmark units
            if (extra_cash > benchmark_balance_in_base) extra_cash = benchmark_balance_in_base;
            units_to_buy = Math.floor(extra_cash / benchmark.livePrice);
        }

        console.log(`strategy ${this.portfolio.cashStrategy} extra_cash ${extra_cash} to buy ${units_to_buy} to sell ${units_to_sell}`);
        const benchmark_on_buy = await this.getContractOrdersQuantity(benchmark, OrderAction.BUY)
            + await this.getOptionsOrdersQuantity(benchmark, OptionType.Put, OrderAction.SELL);
        const benchmark_on_sell = await this.getContractOrdersQuantity(benchmark, OrderAction.SELL);
        if ((this.portfolio.cashStrategy > 0) && ((benchmark_on_buy - benchmark_on_sell) != (units_to_buy - units_to_sell))) {
            // cancel any pending order
            await OpenOrder.findAll({
                where: {
                    portfolio_id: this.portfolio.id,
                    contract_id: this.portfolio.benchmark.id,
                    orderId: { [Op.ne]: 0, },
                }
            }).then((orders) => orders.reduce((p, order) => {
                return p.then(() => this.api.cancelOrder(order.orderId));
            }, Promise.resolve()));
            if ((units_to_buy - units_to_sell) < 0) await this.api.placeNewOrder(benchmark, ITradingBot.BenchmarkOrder(OrderAction.SELL, units_to_sell))
                .then((orderId: number) => { console.log("orderid:", orderId.toString()); });
            else if ((units_to_buy - units_to_sell) > 0) await this.api.placeNewOrder(benchmark, ITradingBot.BenchmarkOrder(OrderAction.BUY, units_to_buy))
                .then((orderId: number) => { console.log("orderid:", orderId.toString()); });
        }
        setTimeout(() => this.emit("process"), 3600 * 1000);    // wait 1 hour
        console.log("CashManagementBot process end");
    }

    public async start(): Promise<void> {
        this.on("process", this.process);
        setTimeout(() => this.emit("process"), 60 * 1000);  // start after 1 min
    }

}