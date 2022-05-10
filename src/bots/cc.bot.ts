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
} from "../models";
import { OrderAction, OptionType } from "@stoqey/ib";

export class SellCoveredCallsBot extends ITradingBot {

    private async processOnePosition(position: Position): Promise<void> {
        console.log('processing position:');
        this.printObject(position);
        const stock_positions = position.quantity;
        console.log('stock_positions:', stock_positions);
        const stock_sell_orders = await this.getContractOrdersQuantity(position.contract, OrderAction.SELL);
        console.log('stock_sell_orders:', stock_sell_orders);
        const call_positions = await this.getOptionsPositionsQuantity(position.contract, 'C' as OptionType);
        console.log('call_positions:', call_positions);
        const call_sell_orders = -(await this.getOptionsOrdersQuantity(position.contract, 'C' as OptionType, OrderAction.SELL));
        console.log('call_sell_orders:', call_sell_orders);
        const free_for_this_symbol = stock_positions + call_positions + stock_sell_orders + call_sell_orders;
        console.log('free_for_this_symbol in base:', free_for_this_symbol);
        if (free_for_this_symbol > 0) {
            const parameter = await Parameter.findOne({
                where: { 
                    portfolio_id: this.portfolio.id, 
                    stock_id: position.contract.id,
                    ccStrategy: { [Op.and]: {
                        [Op.not]: null,
                        [Op.gt]: 0,
                    }},
                },
                include: {
                    model: Contract,
                    required: true,
                },
            });
            if ((parameter !== null) && (parameter.ccStrategy > 0)
                // RULE : stock price is higher than previous close
                && (parameter.underlying.price > parameter.underlying.previousClosePrice)) {
                this.printObject(parameter);
                const options = await Option.findAll({
                    where: {
                        stock_id: parameter.underlying.id,
                        strike : {
                            [Op.gt]: Math.max(parameter.underlying.price, position.cost / position.quantity), // RULE : strike > cours (OTM) & strike > position avg price
                        },
                        lastTradeDate: { [Op.gt]: new Date() },
                        callOrPut: 'C',
                        delta: {
                            [Op.lt]: (1 - this.portfolio.ccWinRatio),  // RULE : delta < 0.25
                        },
                    },
                    include: [{
                        required: true,
                        model: Contract,
                        where: {
                            bid: {
                                [Op.gte]: this.portfolio.minPremium,    // RULE : premium (bid) >= 0.25$
                            },
                        },
                    }, {
                        required: true,
                        model: Stock,
                        // include: Contract,
                    }],
                    // logging: console.log,
                });
                if (options.length > 0) {
                    for (const option of options) {
                        const expiry: Date = new Date(option.lastTradeDate);
                        const diffDays = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 3600 * 24));
                        option['yield'] = option.contract.bid / option.strike / diffDays * 360;
                        option.stock.contract = await Contract.findByPk(option.stock.id);    
                    }
                    options.sort((a: any, b: any) => b.yield - a.yield);
                    // for (const option of options) {
                    //     console.log('yield of contract', option['yield']);
                    //     this.printObject(option);
                    // }
                    const option = options[0];
                    await this.api.placeNewOrder(
                        ITradingBot.OptionToIbContract(option),
                        ITradingBot.CcOrder(OrderAction.SELL, Math.floor(free_for_this_symbol / option.multiplier), option.contract.ask)).then((orderId: number) => {
                        console.log('orderid:', orderId.toString());
                    });
                }
            }
        }
    }

    private iteratePositions(positions: Position[]): Promise<void> {
        return positions.reduce((p, position) => {
            return p.then(() => this.processOnePosition(position))
        }, Promise.resolve()); // initial
    }
    
    private listStockPostitions(): Promise<Position[]> {
        return Position.findAll(({
            include: {
                model: Contract,
                where: {
                    secType: 'STK',
                }
            },
        }));
    }

    private async process(): Promise<void> {
        console.log('cc bot process begin');
        await this.listStockPostitions().then((result) => this.iteratePositions(result));
        setTimeout(() => this.emit('process'), 60 * 1000);
        console.log('cc bot process end');
    };

    public async start(): Promise<void> {
        await this.init().then(() => {
            this.on('process', this.process);
            setTimeout(() => this.emit('process'), 60 * 1000);
        });
    };

};