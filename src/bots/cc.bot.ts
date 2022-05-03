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
        const order = await OpenOrder.findOne({where: {contract_id: position.contract.id}});
        if (order === null) {
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
                console.log('processing position:');
                this.printObject(position);
                this.printObject(parameter);
                const options = await Option.findAll({
                    where: {
                        stock_id: parameter.underlying.id,
                        strike : {
                            [Op.gt]: parameter.underlying.price,    // RULE : strike > cours (OTM)
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
                        ITradingBot.CspContract(option),
                        ITradingBot.CspOrder(OrderAction.SELL, 1, option.contract.ask)).then((orderId: number) => {
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