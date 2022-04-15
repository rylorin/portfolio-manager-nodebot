import { ITradingBot } from ".";
import { sequelize, Contract, Stock, Option, Position, OpenOrder } from "../models";
import { QueryTypes, Op } from 'sequelize';
import { OrderAction } from "@stoqey/ib";

export class RollOptionPositionsBot extends ITradingBot {

    private async processOnePosition(position: Position): Promise<void> {
        console.log('processing position:');
        this.printObject(position);
        const order = await OpenOrder.findOne({where: {contract_id: position.contract.id}});
        if (order === null) {
            const option = await Option.findByPk(position.contract.id, {include: Stock});
            const stock: Contract = await Contract.findByPk(option.stock.id);
            console.log('stock:');
            this.printObject(stock);
            if (option.callOrPut == 'P') {
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
                        }
                    },
                    logging: console.log,
                }).then((result) => result.sort((a, b) => {
                    if (a.lastTradeDate > b.lastTradeDate) return 1;
                    else if (a.lastTradeDate < b.lastTradeDate) return -1;
                    else return (b.strike - a.strike);
                }));
                // this.printObject(rolllist);
                if (rolllist.length > 0) {
                    let selected: Option = undefined;   // default or selected by strategy
                    let defensive: Option = undefined;  // lowest delta
                    let agressive: Option = undefined;  // first OTM
                    for (const opt of rolllist) {
                        if (!selected) selected = opt;
                        if (!defensive) defensive = opt;
                        if (!agressive && (opt.strike < stock.price)) agressive = opt;
                        if (opt.delta < defensive.delta) defensive = opt;
                    }
                    if (!agressive) agressive = selected ?? rolllist[0];
                    console.log('option contract for defensive strategy:')
                    this.printObject(defensive);
                    const defensive_price = defensive.contract.bid - position.contract.ask;
                    console.log('price:', defensive_price);
                    console.log('option contract for agressive strategy:')
                    this.printObject(agressive);
                    const agressive_price = agressive.contract.price - position.contract.price;
                    console.log('price:', agressive_price);
                    this.api.placeNewOrder(
                        ITradingBot.OptionComboContract(stock.symbol, position.contract.conId, selected.contract.conId),
                        ITradingBot.ComboLimitOrder(OrderAction.BUY, position.quantity, agressive_price)).then((orderId: number) => {
                        console.log('orderid:', orderId.toString());
                    });
                } else {
                    this.error('warning: can not roll contract');
                }
        } else if (option.callOrPut == 'C') {
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
                    let selected: Option = undefined;   // default or selected by strategy
                    let defensive: Option = undefined;  // lowest delta
                    let agressive: Option = undefined;  // first OTM
                    for (const opt of rolllist) {
                        if (!selected && (opt.strike > option.strike)) selected = opt;
                        if (!agressive && (opt.strike > stock.price)) agressive = opt;
                        if (!defensive) defensive = opt;
                        if (opt.delta < defensive.delta) defensive = opt;
                    }
                    // if (!selected) selected = rolllist[0];
                    // if (!agressive) agressive = selected;
                    if (!agressive) agressive = selected ?? rolllist[0];
                    console.log('option contract for defensive strategy:')
                    this.printObject(defensive);
                    const defensive_price = defensive.contract.bid - position.contract.ask;
                    console.log('price:', defensive_price);
                    console.log('option contract for agressive strategy:')
                    this.printObject(agressive);
                    const agressive_price = agressive.contract.price - position.contract.price;
                    console.log('price:', agressive_price);
                    this.api.placeNewOrder(
                        ITradingBot.OptionComboContract(stock.symbol, position.contract.conId, selected.contract.conId),
                        ITradingBot.ComboLimitOrder(OrderAction.BUY, position.quantity, agressive_price)).then((orderId: number) => {
                        console.log('orderid:', orderId.toString());
                    });
                } else {
                    this.error('warning: can not roll contract');
                }
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
        setTimeout(() => this.emit('process'), 60000);
        console.log('process end');
    };
  
    public start(): void {
        this.on('process', this.process);
        setTimeout(() => this.emit('process'), 6000);
      };
    
      public stop(): void {};
    
}