import { ITradingBot } from ".";
import {
    Contract,
    Stock,
    Option,
    Position,
    OpenOrder,
    Parameter,
    Portfolio,
} from "../models";
import { QueryTypes, Op } from "sequelize";
import { OrderAction } from "@stoqey/ib";

const ROLL_FREQ: number = parseInt(process.env.ROLL_FREQ) || 10;  // mins
const DEFENSIVE_ROLL_DAYS: number = parseInt(process.env.DEFENSIVE_ROLL_DAYS) || 6;  // days
const AGRESSIVE_ROLL_DAYS: number = parseInt(process.env.AGRESSIVE_ROLL_DAYS) || 0;  // days

export class RollOptionPositionsBot extends ITradingBot {

    private async processOnePosition(position: Position): Promise<void> {
        console.log("processing position:");
        this.printObject(position);
        if (position.quantity < 0) {
            // at the moment we only roll short positions
            const order = await OpenOrder.findOne({
                where: {
                    contract_id: position.contract.id,
                    status: {
                        [Op.in]: [
                            "Submitted", "PreSubmitted",
                        ]
                    },
                },
            });
            if (order === null) {
                const option = await Option.findByPk(position.contract.id, { include: Stock });
                const stock: Contract = await Contract.findByPk(option.stock.id);
                const parameter = await Parameter.findOne({
                    where: {
                        portfolio_id: this.portfolio.id,
                        stock_id: option.stock.id,
                        // rollStrategy: { [Op.and]: {
                        //     [Op.not]: null,
                        //     [Op.gt]: 0,
                        // }},
                    },
                    include: {
                        model: Contract,
                        required: true,
                    },
                });
                if (parameter !== null) {
                    const expiry: Date = new Date(option.lastTradeDate);
                    const diffDays = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 3600 * 24));
                    console.log("stock:");
                    this.printObject(stock);
                    if (option.callOrPut == "P") {                                                  // PUT
                        const rolllist = await Option.findAll({
                            where: {
                                stock_id: option.stock.id,
                                strike: { [Op.lte]: option.strike },
                                lastTradeDate: { [Op.gt]: option.lastTradeDate },
                                callOrPut: option.callOrPut,
                            },
                            include: {
                                model: Contract,
                                where: {
                                    bid: {
                                        [Op.and]: {
                                            [Op.not]: null,
                                            [Op.gt]: position.contract.ask,
                                        }
                                    },
                                },
                                required: true,
                            },
                            // logging: console.log,
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
                            if ((!defensive) && (!agressive)) {
                                defensive = rolllist[0];
                                agressive = rolllist[0];
                            } else if (!defensive) defensive = agressive;
                            else if (!agressive) agressive = defensive;
                            // this.printObject(rolllist);
                            console.log("option contract for defensive strategy:");
                            this.printObject(defensive);
                            console.log("option contract for agressive strategy:");
                            this.printObject(agressive);
                            let selected: Option = undefined;
                            let price: number = undefined;
                            if (((parameter.rollPutStrategy == 1) && (diffDays > DEFENSIVE_ROLL_DAYS))
                                || ((parameter.rollPutStrategy == 2) && (diffDays > AGRESSIVE_ROLL_DAYS))) {
                                console.log("too early to roll contract:", diffDays, "days before exipiration");
                            } else {
                                if ((parameter.rollPutStrategy == 1) && defensive) {
                                    selected = defensive;
                                    price = position.contract.ask - defensive.contract.bid;
                                } else if ((parameter.rollPutStrategy == 2) && agressive) {
                                    selected = agressive;
                                    price = position.contract.ask - agressive.contract.bid;
                                }
                                await this.api.placeNewOrder(
                                    ITradingBot.OptionComboContract(stock, selected.contract.conId, position.contract.conId),
                                    ITradingBot.ComboLimitOrder(OrderAction.SELL, Math.abs(position.quantity), -price)).then((orderId: number) => {
                                        console.log("orderid:", orderId.toString());
                                    });
                            }
                        } else {
                            this.error("can not roll contract: empty list");
                        }
                    } else if (option.callOrPut == "C") {                                           // CALL
                        const rolllist = await Option.findAll({
                            where: {
                                stock_id: option.stock.id,
                                strike: { [Op.gte]: option.strike },
                                lastTradeDate: { [Op.gt]: option.lastTradeDate },
                                callOrPut: option.callOrPut,
                            },
                            include: {
                                model: Contract,
                                where: {
                                    bid: {
                                        [Op.and]: {
                                            [Op.not]: null,
                                            [Op.gt]: position.contract.ask,
                                        }
                                    },
                                },
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
                            if ((!defensive) && (!agressive)) {
                                defensive = rolllist[0];
                                agressive = rolllist[0];
                            } else if (!defensive) defensive = agressive;
                            else if (!agressive) agressive = defensive;
                            // this.printObject(rolllist);
                            console.log("option contract for defensive strategy:");
                            this.printObject(defensive);
                            console.log("option contract for agressive strategy:");
                            this.printObject(agressive);
                            let selected: Option = undefined;
                            let price: number = undefined;
                            if (((parameter.rollCallStrategy == 1) && (diffDays > DEFENSIVE_ROLL_DAYS))
                                || ((parameter.rollCallStrategy == 2) && (diffDays > AGRESSIVE_ROLL_DAYS))) {
                                console.log("too early to roll contract:", diffDays, "days before exipiration");
                            } else {
                                if ((parameter.rollCallStrategy == 1) && defensive) {
                                    selected = defensive;
                                    price = position.contract.ask - defensive.contract.bid;
                                } else if ((parameter.rollCallStrategy == 2) && agressive) {
                                    selected = agressive;
                                    price = position.contract.ask - agressive.contract.bid;
                                }
                                await this.api.placeNewOrder(
                                    ITradingBot.OptionComboContract(stock, selected.contract.conId, position.contract.conId),
                                    ITradingBot.ComboLimitOrder(OrderAction.SELL, Math.abs(position.quantity), -price))
                                    .then((orderId: number) => {
                                        console.log("orderid:", orderId.toString());
                                    });
                            }
                        } else {
                            this.error("can not roll contract: empty list");
                        }
                    }
                } else {
                    console.log("ignored: no parameters for underlying");
                }
            } else {
                console.log("ignored (already in open orders list)");
            }
        }
    }

    private iteratePositions(positions: Position[]): Promise<void> {
        return positions.reduce((p, position) => {
            return p.then(() => this.processOnePosition(position));
        }, Promise.resolve()); // initial
    }

    private listItmOptionPostitions(): Promise<Position[]> {
        return Position.findAll(({ include: Contract })).then(async (positions) => {
            const result: Position[] = [];
            for (const position of positions) {
                if ((position.contract.secType == "OPT")
                    && (position.quantity)) {
                    const opt = await Option.findByPk(position.contract.id, { include: Stock });
                    const stock: Contract = await Contract.findByPk(opt.stock.id, {});
                    const price = stock.price != null ? stock.price : stock.previousClosePrice;
                    // console.log(price);
                    if ((price != null)
                        && (opt.callOrPut == "P")
                        && (price < opt.strike)) {
                        // this.printObject(opt);
                        // this.printObject(stock);
                        result.push(position);
                    } else if ((price != null)
                        && (opt.callOrPut == "C")
                        && (price > opt.strike)) {
                        // this.printObject(opt);
                        // this.printObject(stock);
                        result.push(position);
                    }
                }
            }
            return result;
        });
    }

    public async process(): Promise<void> {
        console.log("RollOptionPositionsBot process begin");
        await this.listItmOptionPostitions().then((result) => this.iteratePositions(result));
        setTimeout(() => this.emit("process"), ROLL_FREQ * 60000);
        console.log("RollOptionPositionsBot process end");
    }

    public async start(): Promise<void> {
        await Portfolio.findOne({
            where: {
                account: this.accountNumber,
            }
        }).then((portfolio) => this.portfolio = portfolio);
        this.on("process", this.process);
        setTimeout(() => this.emit("process"), 6000);
    }

}