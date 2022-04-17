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

export class SellCoveredCallsBot extends ITradingBot {

    private async processOnePosition(position: Position): Promise<void> {
        console.log('processing position:');
        this.printObject(position);
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
            });
            if (parameter !== null) {
                this.printObject(parameter);
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
        console.log('process begin');
        await this.listStockPostitions().then((result) => this.iteratePositions(result));
        setTimeout(() => this.emit('process'), 6000);
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

};