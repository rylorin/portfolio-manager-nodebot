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
import { QueryTypes, Op } from 'sequelize';
import { OrderAction } from "@stoqey/ib";

const ROLL_FREQ: number = parseInt(process.env.ROLL_FREQ) || 10;  // mins

export class RollOptionPositionsBot extends ITradingBot {

    private async processOnePosition(position: Position): Promise<void> {
        console.log('processing position:');
        this.printObject(position);
        const order = await OpenOrder.findOne({where: {contract_id: position.contract.id}});
        if (order === null) {
            const option = await Option.findByPk(position.contract.id, {include: Stock});
            const stock: Contract = await Contract.findByPk(option.stock.id);
            const parameter = await Parameter.findOne({
                where: { 
                    portfolio_id: this.portfolio.id, 
                    stock_id: option.stock.id,
                    rollStrategy: { [Op.and]: {
                        [Op.not]: null,
                        [Op.gt]: 0,
                    }},
                },
                include: {
                    model: Contract,
                    required: true,
                },
            });
            if ((parameter !== null) && (parameter.rollStrategy > 0)) {
                console.log('stock:');
                this.printObject(stock);
                if (option.callOrPut == 'P') {                                          // PUT
                    let rolllist = await Option.findAll({
                        where: {
                            stock_id: option.stock.id,
                            strike: { [Op.lte]: option.strike},
                            lastTradeDate: { [Op.gt]: option.lastTradeDate },
                            callOrPut: option.callOrPut,
                        },
                        include: {
                            model: Contract,
                            where: {
                                bid: { [Op.and]: {
                                    [Op.not]: null,
                                    [Op.gt]: position.contract.ask,
                                }},
                            },
                            required: true,
                        },
                        logging: console.log,
                    }).then((result) => result.sort((a, b) => {
                        if (a.lastTradeDate > b.lastTradeDate) return 1;
                        else if (a.lastTradeDate < b.lastTradeDate) return -1;
                        else return (b.strike - a.strike);
                    }));
                    // this.printObject(rolllist);
                    if (rolllist.length > 0) {
                        let defensive: Option = undefined;  // lowest delta
                        let agressive: Option = undefined;  // first OTM
                        for (const opt of rolllist) {
                            if (!agressive && (opt.strike < stock.price)) agressive = opt;
                            if (!defensive && (opt.delta !== null)) defensive = opt;
                            if ((opt.delta !== null) && (opt.delta > defensive.delta)) defensive = opt;
                        }
                        // this.printObject(rolllist);
                        console.log('option contract for defensive strategy:')
                        this.printObject(defensive);
                        console.log('option contract for agressive strategy:')
                        this.printObject(agressive);
                        let selected: Option = undefined;
                        let price: number = undefined;
                        if ((parameter.rollStrategy == 1) && defensive) {
                            selected = defensive;
                            price = position.contract.ask - defensive.contract.bid;
                        } else if ((parameter.rollStrategy == 2) && agressive) {
                            selected = agressive;
                            price = position.contract.ask - agressive.contract.bid;
                        // } else {
                        //     selected = rolllist[0];
                        //     price = selected.contract.bid - position.contract.ask;
                        }
                        if (price) {
                            await this.api.placeNewOrder(
                                ITradingBot.OptionComboContract(stock, position.contract.conId, selected.contract.conId),
                                ITradingBot.ComboLimitOrder(OrderAction.BUY, -position.quantity, price)).then((orderId: number) => {
                                console.log('orderid:', orderId.toString());
                            });
                        } else {
                            this.error('warning: can not roll contract');
                        };
                    } else {
                        this.error('warning: can not roll contract');
                    }
                } else if (option.callOrPut == 'C') {                                           // CALL
                    const rolllist = await Option.findAll({
                        where: {
                            stock_id: option.stock.id,
                            strike: { [Op.gte]: option.strike},
                            lastTradeDate: { [Op.gt]: option.lastTradeDate },
                            callOrPut: option.callOrPut,
                        },
                        include: {
                            model: Contract,
                            where: {
                                bid: { [Op.and]: {
                                    [Op.not]: null,
                                    [Op.gt]: position.contract.ask,
                                }},
                            }
                        },
                    }).then((result) => result.sort((a, b) => {
                            if (a.lastTradeDate > b.lastTradeDate) return 1;
                            else if (a.lastTradeDate < b.lastTradeDate) return -1;
                            else return (a.strike - b.strike);
                    }));
                    // this.printObject(rolllist);
                    if (rolllist.length > 0) {
                        let defensive: Option = undefined;  // lowest delta
                        let agressive: Option = undefined;  // first OTM
                        for (const opt of rolllist) {
                            if (!agressive && (opt.strike > stock.price)) agressive = opt;
                            if (!defensive && (opt.delta !== null)) defensive = opt;
                            if ((opt.delta !== null) && (opt.delta < defensive.delta)) defensive = opt;
                        }
                        // this.printObject(rolllist);
                        console.log('option contract for defensive strategy:')
                        this.printObject(defensive);
                        console.log('option contract for agressive strategy:')
                        this.printObject(agressive);
                        let selected: Option = undefined;
                        let price: number = undefined;
                        if ((parameter.rollStrategy == 1) && defensive) {
                            selected = defensive;
                            price = position.contract.ask - defensive.contract.bid;
                        } else if ((parameter.rollStrategy == 2) && agressive) {
                            selected = agressive;
                            price = position.contract.ask - agressive.contract.bid;
                        // } else {
                        //     selected = rolllist[0];
                        //     price = selected.contract.bid - position.contract.ask;
                        }
                        if (price) {
                            await this.api.placeNewOrder(
                                ITradingBot.OptionComboContract(stock, position.contract.conId, selected.contract.conId),
                                ITradingBot.ComboLimitOrder(OrderAction.BUY, -position.quantity, price))
                                .then((orderId: number) => {
                                    console.log('orderid:', orderId.toString());
                            });
                        } else {
                            this.error('warning: can not roll contract');
                        }
                    } else {
                        this.error('warning: can not roll contract');
                    }
                }
            } else {
                console.log('ignored (roll strategy set to off)');
            }
        } else {
            console.log('ignored (already in open orders list)');
        }
    }
    
    private iteratePositions(positions: Position[]): Promise<void> {
        return positions.reduce((p, position) => {
            return p.then(() => this.processOnePosition(position))
        }, Promise.resolve()); // initial
    }

    private listItmOptionPostitions(): Promise<Position[]> {
        return Position.findAll(({include: Contract})).then(async (positions) => {
            let result: Position[] = [];
            for (const position of positions) {
                if ((position.contract.secType == 'OPT')
                && (position.quantity)) {
                    const opt = await Option.findByPk(position.contract.id, {include: Stock});
                    const stock: Contract = await Contract.findByPk(opt.stock.id, {});
                    const price = stock.price != null ? stock.price : stock.previousClosePrice;
                    // console.log(price);
                    if ((price != null)
                        && (opt.callOrPut == 'P')
                        && (price < opt.strike)) {
                            // this.printObject(opt);
                            // this.printObject(stock);
                            result.push(position);
                    } else if ((price != null)
                        && (opt.callOrPut == 'C')
                        && (price > opt.strike)) {
                            // this.printObject(opt);
                            // this.printObject(stock);
                            result.push(position);
                    }
                }
            }
            return result;
        })
    };

    public async process(): Promise<void> {
        console.log('process begin');
        await this.listItmOptionPostitions().then((result) => this.iteratePositions(result));
        setTimeout(() => this.emit('process'), ROLL_FREQ * 60000);
        console.log('process end');
    };
  
    public async start(): Promise<void> {
        await Portfolio.findOne({
            where: {
              account: this.accountNumber,
            }
          }).then((portfolio) => this.portfolio = portfolio);
            this.on('process', this.process);
        setTimeout(() => this.emit('process'), 6000);
    };
    
}