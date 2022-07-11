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
import { ITradingBot } from ".";
import {
    Contract,
    Stock,
    Option,
    Position,
    OpenOrder,
    Parameter,
    Portfolio,
    Balance,
} from "../models";
import yahooFinance from "yahoo-finance2";
import { Quote } from "yahoo-finance2/dist/esm/src/modules/quote";

const YAHOO_PRICE_FREQ: number = parseInt(process.env.YAHOO_PRICE_FREQ) || 15;                // secs
const YAHOO_PRICE_AGE: number = parseInt(process.env.YAHOO_PRICE_FREQ) || 60;                 // mins
const BATCH_SIZE_YAHOO_PRICE: number = parseInt(process.env.BATCH_SIZE_YAHOO_PRICE) || 512;   // units

type MappedQuote = {
    contract: Contract,
    symbol: string,
    quote?: Quote,
}

export class YahooUpdateBot extends ITradingBot {

    protected static getYahooTicker(contract: Contract): string {
        let $ticker: string = contract.symbol.replace("-PR", "-P");
        const $exchange: string = contract.exchange;
        if (($exchange == "SBF") || ($exchange == "IBIS2")) {
            $ticker = $ticker + ".PA";
        } else if (($exchange == "LSE") || ($exchange == "LSEETF")) {
            $ticker = $ticker + ".L";
        } else if ($exchange == "VSE") {
            $ticker = $ticker + ".VI";
        } else if ($exchange == "BVME") {
            $ticker = $ticker + ".MI";
        } else if ($exchange == "TSEJ") {
            $ticker = $ticker + ".T";
        } else if (($exchange == "TSE") || (contract.currency == "CAD")) {
            $ticker = $ticker.replace(".", "-") + ".TO";
        } else if ($exchange == "AEB") {
            $ticker = $ticker + ".AS";
        } else if (($exchange == "EBS") || (contract.currency == "CHF")) {
            $ticker = $ticker + ".SW";
        } else if ($exchange == "FWB") {
            $ticker = $ticker + ".DE";
        } else if ($exchange == "IBIS") {
            $ticker = (($ticker[$ticker.length - 1] == "d") ? $ticker.substring(0, $ticker.length - 1) : $ticker) + ".DE";
        }
        return $ticker;
    }

    protected static formatOptionName(ibContract: Option): string {
        // console.log(typeof ibContract.lastTradeDate);
        const lastTradeDateOrContractMonth: string = ibContract.lastTradeDate.toISOString();
        const year = lastTradeDateOrContractMonth.substring(2, 4);
        const month = lastTradeDateOrContractMonth.substring(5, 7);
        const day = lastTradeDateOrContractMonth.substring(8, 10);
        const datestr: string = year + month + day;
        let strike: string = (ibContract.strike * 1000).toString();
        while (strike.length < 8) strike = "0" + strike;
        const name = `${ibContract.stock.contract.symbol}${datestr}${ibContract.callOrPut}${strike}`;
        return name;
    }

    private iterateResults(q: MappedQuote[]): Promise<any[]> {
        const promises: Promise<any>[] = [];
        for (const r of q) {
            if (r.quote !== undefined) {
                const prices: any = {
                    price: r.quote?.regularMarketPrice || null,
                    ask: r.quote?.ask || null,
                    bid: r.quote?.bid || null,
                    fiftyTwoWeekLow: r.quote?.fiftyTwoWeekLow || null,
                    fiftyTwoWeekHigh: r.quote?.fiftyTwoWeekHigh || null,
                    updatedAt: Date.now(),
                };
                if (r.quote?.regularMarketPreviousClose) prices.previousClosePrice = r.quote?.regularMarketPreviousClose;
                promises.push(Contract.update(prices, { where: { id: r.contract.id, }, }));
                if (r.contract.secType == SecType.STK) {
                    const stock_values = {
                        epsTrailingTwelveMonths: r.quote.epsTrailingTwelveMonths,
                        epsForward: r.quote.epsForward,
                        trailingAnnualDividendRate: r.quote.trailingAnnualDividendRate,
                    };
                    promises.push(Stock.update(stock_values, { where: { id: r.contract.id, }, }));
                } else if (r.contract.secType == SecType.OPT) {
                    const values: any = {
                    };
                    if (r.quote?.impliedVolatility) values.impliedVolatility = r.quote.impliedVolatility;
                    promises.push(Option.update(values, { where: { id: r.contract.id, }, }));
                }
            } else {
                promises.push(Contract.update({ updatedAt: new Date() }, { where: { id: r.contract.id, }, }));
            }
        }
        return Promise.all(promises);
    }

    private async fetchQuotes(q: MappedQuote[]) {
        console.log(`fetchQuotes ${q.length} items`);
        // this.printObject(q);
        let quotes: Quote[] = undefined;
        try {
            quotes = await yahooFinance.quote(q.map(a => a.symbol), {}, { validateResult: false, });
        } catch (e) {
            quotes = e.result;
        }
        if (quotes !== undefined) {
            for (const quote of quotes) {
                const i = q.findIndex(
                    (p) => p.symbol == quote.symbol
                );
                if ((i !== -1) && (q[i].contract.currency == quote.currency)) q[i].quote = quote;
            }
        }
        return q;
    }

    private findCurrencies(limit: number): Promise<MappedQuote[]> {
        const now: number = Date.now();
        return Contract.findAll({
            where: {
                secType: SecType.CASH,
                updatedAt: {
                    [Op.or]: {
                        [Op.lt]: new Date(now - (YAHOO_PRICE_AGE * 60 * 1000)),
                        [Op.is]: null,
                    },
                },
            },
            order: [["updatedAt", "ASC"]],
            limit: limit,
            // logging: console.log,
        })
            .then((currencies) => {
                const p: MappedQuote[] = [];
                for (const currency of currencies) {
                    p.push({ contract: currency, symbol: currency.symbol.substring(0, 3) + currency.currency + "=X" });
                }
                return p;
            });
    }

    private findStocks(limit: number): Promise<MappedQuote[]> {
        const now: number = Date.now();
        return Stock.findAll({
            include: {
                association: "contract",
                model: Contract,
                required: true,
                where: {
                    exchange: {
                        [Op.ne]: "VALUE",  // Contracts that are not tradable (removed, merges, ...) are on VALUE exchange 
                    },
                    updatedAt: {
                        [Op.or]: {
                            [Op.lt]: new Date(now - (YAHOO_PRICE_AGE * 60 * 1000)),
                            [Op.is]: null,
                        },
                    },
                },
            },
            order: [["contract", "updatedAt", "ASC"]],
            limit: limit,
            // logging: console.log,
        })
            .then((stocks) => {
                const p: MappedQuote[] = [];
                for (const stock of stocks) {
                    p.push({ contract: stock.contract, symbol: YahooUpdateBot.getYahooTicker(stock.contract) });
                }
                return p;
            });
    }

    private findOptions(limit: number): Promise<MappedQuote[]> {
        const now: number = Date.now();
        return Option.findAll({
            where: {
                lastTradeDate: {
                    // [Op.gt]: new Date(now + (7 * 1440 * 60 * 1000)),   // don't update short term options as their price should be real time updted
                    [Op.gt]: new Date(now),   // don't update expired contracts
                },
            },
            include: [{
                model: Contract,
                where: {
                    updatedAt: {
                        [Op.or]: {
                            [Op.lt]: new Date(now - (YAHOO_PRICE_AGE * 60 * 1000)),  // Yahoo quotes delayed by 20 mins
                            [Op.is]: null,
                        },
                    },
                    currency: "USD",
                    exchange: {
                        [Op.ne]: "VALUE",  // Contracts that are not tradable (removed, merges, ...) are on VALUE exchange 
                    },
                },
            }, {
                model: Stock,
                required: true,
                include: [Contract],
            }],
            order: [["contract", "updatedAt", "ASC"]],
            limit: limit,
            // logging: console.log,
        })
            .then((options) => {
                const p: MappedQuote[] = [];
                for (const option of options) {
                    p.push({ contract: option.contract, symbol: YahooUpdateBot.formatOptionName(option) });
                }
                return p;
            });
    }

    private async process(): Promise<void> {
        console.log("YahooUpdateBot process begin");

        let contracts: MappedQuote[] = [];
        if (contracts.length < BATCH_SIZE_YAHOO_PRICE) {
            const c = await this.findCurrencies(BATCH_SIZE_YAHOO_PRICE - contracts.length);
            console.log(c.length, "currency contract(s)");
            contracts = contracts.concat(c);
        }
        if (contracts.length < BATCH_SIZE_YAHOO_PRICE) {
            const c = await this.findStocks(BATCH_SIZE_YAHOO_PRICE - contracts.length);
            console.log(c.length, "stock contract(s)");
            contracts = contracts.concat(c);
        }
        if (contracts.length < BATCH_SIZE_YAHOO_PRICE) {
            const c = await this.findOptions(BATCH_SIZE_YAHOO_PRICE - contracts.length);
            console.log(c.length, "option contract(s)");
            contracts = contracts.concat(c);
        }
        await this.fetchQuotes(contracts)
            .then((q) => this.iterateResults(q));

        setTimeout(() => this.emit("process"), YAHOO_PRICE_FREQ * 1000);
        console.log("YahooUpdateBot process end");
    }

    public async start(): Promise<void> {
        this.on("process", this.process);

        yahooFinance.setGlobalConfig({ validation: { logErrors: true } });
        // this.printObject(await yahooFinance.quote("SPY220708C00295000"));

        setTimeout(() => this.emit("process"), 1 * 60 * 1000);  // start after 1 min
    }

}