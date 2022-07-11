import { QueryTypes, Op } from "sequelize";
import {
    Contract as IbContract,
    IBApiNext,
    IBApiNextError,
    BarSizeSetting,
    SecType,
    ContractDetails,
    OptionType,
    Bar,
    TickType,
} from "@stoqey/ib";
import { TickType as IBApiTickType } from "@stoqey/ib/dist/api/market/tickType";
import { SecurityDefinitionOptionParameterType, IBApiNextTickType } from "@stoqey/ib/dist/api-next";
import { MutableMarketData } from "@stoqey/ib/dist/core/api-next/api/market/mutable-market-data";
import { IBApiNextApp } from "@stoqey/ib/dist/tools/common/ib-api-next-app";
import { sequelize, Contract, Stock, Option, Currency } from "../models";
import { ITradingBot } from ".";

const OPTIONS_LIST_BUILD_FREQ: number = parseInt(process.env.OPTIONS_LIST_BUILD_FREQ) || 24;        // hours
const OPTIONS_PRICE_TIMEFRAME: number = parseInt(process.env.OPTIONS_PRICE_TIMEFRAME) || 366;       // days

export class OptionsCreateBot extends ITradingBot {

    private async iterateSecDefOptParamsForExpStrikes(stock: Contract, expirations: string[], strikes: number[]): Promise<void> {
        // console.log(`iterateSecDefOptParamsForExpStrikes for ${stock.symbol}, ${expirations.length} exp, ${strikes.length} strikes`)
        for (const expstr of expirations) {
            const expdate = ITradingBot.expirationToDate(expstr);
            const days = (expdate.getTime() - Date.now()) / 60000 / 1440;
            if ((days > 0) && (days < OPTIONS_PRICE_TIMEFRAME)) {
                console.log(stock.symbol, expstr, days, "days", strikes.length, "strikes");
                for (const strike of strikes) {
                    // console.log("iterateSecDefOptParamsForExpStrikes", stock.symbol, expstr, strike);
                    const ibContract: IbContract = {
                        secType: SecType.OPT,
                        symbol: stock.symbol,
                        currency: stock.currency,
                        lastTradeDateOrContractMonth: expstr,
                        strike: strike,
                        right: undefined,
                    };
                    // const put = this.buildOneOptionContract(stock, expstr, strike, OptionType.Put)
                    //   .catch((err) => { /* silently ignore any error */ });
                    // const call = this.buildOneOptionContract(stock, expstr, strike, OptionType.Call)
                    //   .catch((err) => { /* silently ignore any error */ });
                    ibContract.right = OptionType.Put;
                    const put = this.findOrCreateContract(ibContract)
                        .catch((err) => {
                            /* silently ignore any error */
                            return Promise.resolve(null as Contract);
                        });
                    ibContract.right = OptionType.Call;
                    const call = this.findOrCreateContract(ibContract)
                        .catch((err) => {
                            /* silently ignore any error */
                            return Promise.resolve(null as Contract);
                        });
                    await Promise.all([put, call]);
                }
            }
        }
        return Promise.resolve();
    }

    private iterateSecDefOptParams(stock: Contract, details: SecurityDefinitionOptionParameterType[]): Promise<void> {
        // console.log(`iterateSecDefOptParams: ${stock.symbol} ${details.length} details`)
        // use details associated to SMART exchange or first one if SMART not present
        let idx = 0;
        for (let i = 0; i < details.length; i++) {
            if (details[i].exchange == "SMART") {
                idx = i;
                break;
            } else if (details[i].tradingClass == stock.symbol) {
                idx = i;
            }
        }
        return this.iterateSecDefOptParamsForExpStrikes(stock, details[idx].expirations, details[idx].strikes);
    }

    private requestSecDefOptParams(stock: Contract): Promise<SecurityDefinitionOptionParameterType[]> {
        console.log(`requestSecDefOptParams: ${stock.symbol}`);
        return this.api
            .getSecDefOptParams(
                stock.symbol,
                "", // exchange but only empty string returns results
                stock.secType as SecType,
                stock.conId
            )
            .catch((err: IBApiNextError) => {
                console.log(`getSecDefOptParams failed with '${err.error.message}'`);
                throw (err.error);
            });
    }

    private iterateToBuildOptionList(contracts: Contract[]): Promise<any> {
        console.log(`iterateToBuildOptionList ${contracts.length} items`);
        return contracts.reduce((p, stock) => {
            return p.then(() => {
                console.log(`iterateToBuildOptionList ${stock.symbol} ${stock["options_age"] * 24} vs ${OPTIONS_LIST_BUILD_FREQ}`);
                if ((stock["options_age"] * 24) > OPTIONS_LIST_BUILD_FREQ) {
                    console.log("iterateToBuildOptionList: option contracts list need refreshing");
                    return this.requestSecDefOptParams(stock)
                        .then((params) => this.iterateSecDefOptParams(stock, params));
                }
                return Promise.resolve();
            });
        }, Promise.resolve()); // initial
    }

    private findStocksToListOptions(): Promise<Contract[]> {
        return sequelize.query(`
        SELECT
          (julianday('now') - MAX(julianday(IFNULL(contract.createdAt, '2022-01-01')))) options_age,
          contract.symbol, contract.con_id conId, contract.id id, contract.currency currency, contract.secType secType,
          contract.createdAt
        FROM option, contract, trading_parameters
        WHERE contract.id = option.stock_id
          AND trading_parameters.stock_id =  option.stock_id
        GROUP BY option.stock_id
        ORDER BY options_age DESC
          `,
            {
                model: Contract,
                raw: true,
                type: QueryTypes.SELECT,
                // logging: console.log,
            });
    }

    private async buildOptionsList(): Promise<void> {
        console.log("buildOptionsList");
        await this.findStocksToListOptions().then((stocks) => this.iterateToBuildOptionList(stocks));
        console.log("buildOptionsList done");
        setTimeout(() => this.emit("buildOptionsList"), 3600 * 1000); // come back after 1 hour and check again
    }

    public start(): void {
        this.on("buildOptionsList", this.buildOptionsList);

        setTimeout(() => this.emit("buildOptionsList"), 60 * 1000);   // start after 1 min
    }

}