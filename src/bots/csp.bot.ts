import { QueryTypes, Op } from 'sequelize';
import { ITradingBot } from ".";
import {
    sequelize,
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
require('dotenv').config();

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
        console.log('processing parameter:');
        this.printObject(parameter);
        // const stock_positions: number = await Position.findAll({
        //     include: {
        //         model: Contract,
        //         where: {
        //             id: parameter.underlying.id,
        //         },
        //     }
        // }).then((positions: Position[]) => positions.reduce((p, position) => (p + position.quantity), 0));
        // const stock_sell_orders: number = await OpenOrder.findAll({
        //     where: {
        //         actionType: OrderAction.SELL,
        //     },
        //     include: {
        //         model: Contract,
        //         where: {
        //             id: parameter.underlying.id,
        //         },
        //     }
        // }).then((orders: OpenOrder[]) => orders.reduce((p, order) => (p - order.remainingQty), 0));
        // const put_positions_amount: number = await Position.findAll({
        //     include: {
        //         model: Contract,
        //         where: {
        //             secType: 'OPT',
        //         },
        //     }
        // }).then((positions: Position[]) => this.sumOptionsPositionsAmount(positions, parameter.underlying.id, 'P' as OptionType));
        // const call_positions_amount: number = await Position.findAll({
        //     include: {
        //         model: Contract,
        //         where: {
        //             secType: 'OPT',
        //         },
        //     }
        // }).then((positions: Position[]) => this.sumOptionsPositionsAmount(positions, parameter.underlying.id, 'C' as OptionType));
        // const put_sell_orders: number = await OpenOrder.findAll({
        //     where: {
        //         actionType: OrderAction.SELL,
        //     },
        //     include: {
        //         model: Contract,
        //         where: {
        //             secType: 'OPT',
        //         },
        //     }
        // }).then((orders: OpenOrder[]) => this.sumOptionsOrders(orders, parameter.underlying.id, 'P' as OptionType));
        const stock_positions = await this.getContractPositionValueInBase(parameter.underlying);
        console.log('stock_positions_amount:', stock_positions);
        const stock_sell_orders = await this.getContractOrderValueInBase(parameter.underlying, OrderAction.SELL);
        console.log('stock_sell_orders_amount:', stock_sell_orders);
        const put_positions_amount = await this.getOptionPositionsValueInBase(parameter.underlying.id, 'P' as OptionType);
        console.log('put_positions value in base:', put_positions_amount);
        const put_sell_orders = await this.getOptionOrdersValueInBase(parameter.underlying.id, 'P' as OptionType, OrderAction.SELL);
        console.log('put_sell_orders value in base:', put_sell_orders);
        const max_engaged = stock_positions - stock_sell_orders - put_positions_amount - put_sell_orders;
        console.log('max engaged:', max_engaged);
        const max_for_this_symbol = (await this.getContractPositionValueInBase(this.portfolio.benchmark)) * parameter.navRatio;
        console.log('max for this symbol:', max_for_this_symbol);
        const free_for_this_symbol = max_for_this_symbol - max_engaged;
        console.log('free_for_this_symbol in base:', free_for_this_symbol);
        const currency = await Currency.findOne({
            where: {
                base: this.portfolio.baseCurrency,
                currency: parameter.underlying.currency,
            }
        });
        console.log('free_for_this_symbol in currency:', free_for_this_symbol * currency.rate);
        const opt = await Option.findAll({
            where: {
                stock_id: parameter.underlying.id,
                strike : { [Op.lt]: (free_for_this_symbol / 100) },
                lastTradeDate: { [Op.gt]: new Date() },
            }
        });
        return { symbol: parameter.underlying.symbol, engaged: max_engaged, options: opt};
    }

    private async iterateParameters(parameters: Parameter[]): Promise<void> {
        let result = [];
        for (const parameter of parameters) {
            result.push(await this.processOneParamaeter(parameter));
        }
        const total_engaged = result.reduce((p, v) => (p + v.engaged), 0);
        let all_options: Option[] = result.reduce((p, v) => [...p, ...v.options], []);
        // filter out too expensive strikes
        let filtered_options: Option[] = [];
        for (const option of all_options) {
            
        }
        // order by yield
    }
    
    private listParameters(): Promise<Parameter[]> {
        return Parameter.findAll(({
            where: {
                navRatio: { [Op.and]: {
                    [Op.not]: null,
                    [Op.gt]: 0,
                }},
            },
            include: {
                model: Contract,
            },
        }));
    }

    private async process(): Promise<void> {
        console.log('process begin');
        console.log('this.portfolio:');
        this.printObject(this.portfolio);
        console.log('benchmark_amount:', await this.getContractPositionValueInBase(this.portfolio.benchmark));
        await this.listParameters().then((result) => this.iterateParameters(result));
        setTimeout(() => this.emit('process'), CSP_FREQ * 1000);
        console.log('process end');
    };

    public async start(): Promise<void> {
        await Portfolio.findOne({
            where: {
              account: this.accountNumber,
            },
            include: {
                model: Contract,
            },
            // logging: console.log, 
        }).then((portfolio) => this.portfolio = portfolio);
        this.on('process', this.process);
        setTimeout(() => this.emit('process'), 6000);
    };

}