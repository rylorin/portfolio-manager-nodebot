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
    Currency,
} from "../models";
import { OrderAction, OptionType } from "@stoqey/ib";

const CSP_FREQ: number = parseInt(process.env.CSP_FREQ) || 10;  // mins

export class SellCashSecuredPutBot extends ITradingBot {

    private async sumOptionsPositionsAmount(positions: Position[], underlying: number, right: OptionType): Promise<number> {
        let result = 0;
        for (const position of positions) {
            const opt = await Option.findOne(
                {
                    where: {
                        id: position.contract.id,
                        callOrPut: right,
                        stock_id: underlying,
                    },
                },
            );
            if (opt !== null) result += position.quantity * opt.multiplier * opt.strike;
        }
        return result;
    }

    private async sumOptionsOrders(orders: OpenOrder[], underlying: number, right: OptionType): Promise<number> {
        let result = 0;
        for (const order of orders) {
            const opt = await Option.findOne(
                {
                    where: {
                        id: order.contract.id,
                        stock_id: underlying,
                        callOrPut: right,
                    },
                },
            );
            if (opt !== null) result += order.remainingQty * opt.multiplier;
        }
        return result;
    }

    private async processOneParamaeter(parameter: Parameter): Promise<{ symbol: string; engaged: number; options: Option[]; }> {
        console.log("processing parameter:");
        this.printObject(parameter);
        const stock_positions = await this.getContractPositionValueInBase(parameter.underlying);
        console.log("stock_positions_amount:", stock_positions);
        const stock_sell_orders = await this.getContractOrderValueInBase(parameter.underlying, OrderAction.SELL);
        console.log("stock_sell_orders_amount:", stock_sell_orders);
        const put_positions_amount = await this.getOptionPositionsEngagedInBase(parameter.underlying.id, OptionType.Put);
        console.log("put_positions value in base:", put_positions_amount);
        const put_sell_orders = -(await this.getOptionOrdersValueInBase(parameter.underlying.id, "P" as OptionType, OrderAction.SELL));
        console.log("put_sell_orders value in base:", put_sell_orders);
        const max_engaged = stock_positions - stock_sell_orders - put_positions_amount - put_sell_orders;
        console.log("max engaged:", max_engaged);
        const max_for_this_symbol = ((await this.getContractPositionValueInBase(this.portfolio.benchmark)) + (await this.getTotalBalanceInBase())) * parameter.navRatio;
        console.log("max for this symbol:", max_for_this_symbol);
        const free_for_this_symbol = max_for_this_symbol - max_engaged;
        console.log("free_for_this_symbol in base:", free_for_this_symbol);
        console.log("parameter.underlying.price:", parameter.underlying.price);
        console.log("free_for_this_symbol in currency:", free_for_this_symbol * this.base_rates[parameter.underlying.currency]);
        // RULE 7: stock price is lower than previous close
        const opt = (parameter.underlying.price > parameter.underlying.previousClosePrice) ? [] : await Option.findAll({
            where: {
                stock_id: parameter.underlying.id,
                strike: {
                    [Op.lt]: Math.min(parameter.underlying.price, (free_for_this_symbol / 100)),    // RULE 2 & 5: strike < cours (OTM) & max ratio per symbol
                },
                lastTradeDate: { [Op.gt]: new Date() },
                callOrPut: "P",
                delta: {
                    [Op.gt]: (this.portfolio.cspWinRatio - 1),  // RULE 3: delta >= -0.2
                },
            },
            include: [{
                required: true,
                model: Contract,
                where: {
                    bid: {
                        [Op.gte]: this.portfolio.minPremium,    // RULE 4: premium (bid) >= 0.25$
                    },
                },
            }, {
                required: true,
                model: Stock,
                // include: { model: Contract, },
            }],
            // logging: console.log,
        });
        return { symbol: parameter.underlying.symbol, engaged: max_engaged, options: opt };
    }

    private async iterateParameters(parameters: Parameter[]): Promise<void> {
        const result = [];
        for (const parameter of parameters) {
            result.push(await this.processOneParamaeter(parameter));
        }
        const total_engaged = result.reduce((p, v) => (p + v.engaged), 0);
        const max_for_all_symbols = ((await this.getContractPositionValueInBase(this.portfolio.benchmark) + (await this.getTotalBalanceInBase())) * this.portfolio.putRatio) - total_engaged;
        console.log("max_for_all_symbols:", max_for_all_symbols, total_engaged);
        const all_options: Option[] = result.reduce((p, v) => [...p, ...v.options], []);
        const filtered_options: Option[] = [];
        for (const option of all_options) {
            // RULE 6: check overall margin space
            if ((option.strike * option.multiplier * this.base_rates[option.contract.currency]) < max_for_all_symbols) {
                if (option.impliedVolatility > option.stock.historicalVolatility) { // RULE 1: implied volatility > historical volatility
                    const expiry: Date = new Date(option.lastTradeDate);
                    const diffDays = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 3600 * 24));
                    option["yield"] = option.contract.bid / option.strike / diffDays * 360;
                    option.stock.contract = await Contract.findByPk(option.stock.id);
                    filtered_options.push(option);
                }
            }
        }
        // order by yield
        filtered_options.sort((a: any, b: any) => b.yield - a.yield);
        if (filtered_options.length > 0) {
            console.log("filtered_options:", filtered_options.length);
            console.log(filtered_options[0]["yield"]);
            this.printObject(filtered_options[0]);
            await this.api.placeNewOrder(
                ITradingBot.OptionToIbContract(filtered_options[0]),
                ITradingBot.CspOrder(OrderAction.SELL, 1, filtered_options[0].contract.ask))
                .then((orderId: number) => { console.log("orderid:", orderId.toString()); });
        }
    }

    private listParameters(): Promise<Parameter[]> {
        return Parameter.findAll(({
            where: {
                cspStrategy: {
                    [Op.and]: {
                        [Op.not]: null,
                        [Op.gt]: 0,
                    }
                },
            },
            include: {
                model: Contract,
                required: true,
            },
            // logging: console.log,
        }));
    }

    private async process(): Promise<void> {
        console.log("SellCashSecuredPutBot process begin");
        console.log("this.portfolio:");
        this.printObject(this.portfolio);
        console.log("benchmark_amount:", await this.getContractPositionValueInBase(this.portfolio.benchmark));
        await this.listParameters().then((result) => this.iterateParameters(result));
        setTimeout(() => this.emit("process"), CSP_FREQ * 60 * 1000);
        console.log("SellCashSecuredPutBot process end");
    }

    public async start(): Promise<void> {
        this.on("process", this.process);
        this.init().then(() => setTimeout(() => this.emit("process"), 6000));
    }

}