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

const YAHOO_PRICE_FREQ: number = parseInt(process.env.YAHOO_PRICE_FREQ) || 15;                 // secs
const BATCH_SIZE_YAHOO_PRICE: number = parseInt(process.env.BATCH_SIZE_YAHOO_PRICE) || 512;    // units

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
        } else if ($exchange == "EBS") {
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

    private async fetchContractsPrices(opts: Option[]) {
        console.log(`fetchContractsPrices ${opts.length} items`);
        const q: { id: number, symbol: string, quote: Quote }[] = [];
        for (const opt of opts) {
            q.push({ id: opt.id, symbol: YahooUpdateBot.formatOptionName(opt), quote: undefined });
        }
        // this.printObject(q);
        let quotes: Quote[] = undefined;
        try {
            quotes = await yahooFinance.quote(q.map(a => a.symbol), {}, { validateResult: false, });
        } catch (e) {
            quotes = e.result;
        }
        const promises: Promise<any>[] = [];
        if (quotes !== undefined) {
            for (const quote of quotes) {
                const i = q.findIndex(
                    (p) => p.symbol == quote.symbol
                );
                if (i !== -1) q[i].quote = quote;
            }
            for (const r of q) {
                const values = {
                    price: r.quote?.regularMarketPrice || null,
                    ask: r.quote?.ask || null,
                    bid: r.quote?.bid || null,
                    previousClosePrice: r.quote?.regularMarketPreviousClose || null,
                    fiftyTwoWeekLow: r.quote?.fiftyTwoWeekLow || null,
                    fiftyTwoWeekHigh: r.quote?.fiftyTwoWeekHigh || null,
                    updatedAt: Date.now(),  // force update
                };
                promises.push(Contract.update(values, { where: { id: r.id, }, }));
                if (r.quote?.quoteType == "OPTION") {
                    const values = {
                        impliedVolatility: r.quote.impliedVolatility,
                    }
                    promises.push(Option.update(values, { where: { id: r.id, }, }));
                }
            }
        }
        await Promise.all(promises);
    }

    private findOptionsToUpdatePrice(limit: number): Promise<Option[]> {
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
                            [Op.lt]: new Date(now - (20 * 60 * 1000)),  // Yahoo quotes delayed by 20 mins
                            [Op.is]: null,
                        },
                    },
                },
            }, {
                model: Stock,
                required: true,
                include: [Contract],
            }],
            order: [["contract", "updatedAt", "ASC"],],
            limit: limit,
            // logging: console.log,
        });
    }

    private async process(): Promise<void> {
        console.log("YahooUpdateBot process begin");

        await this.findOptionsToUpdatePrice(BATCH_SIZE_YAHOO_PRICE)
            .then((opts) => this.fetchContractsPrices(opts));

        setTimeout(() => this.emit("process"), YAHOO_PRICE_FREQ * 1000);
        console.log("YahooUpdateBot process end");
    }

    private async fetchContractsHistory(stoks: Stock[]) {
        console.log(`fetchContractsHistory ${stoks.length} items`);
        const q: { stock: Stock, symbol: string, quote: Quote }[] = [];
        for (const opt of stoks) {
            q.push({ stock: opt, symbol: YahooUpdateBot.getYahooTicker(opt.contract), quote: undefined });
        }
        // this.printObject(q);
        let quotes: Quote[] = undefined;
        try {
            quotes = await yahooFinance.quote(q.map(a => a.symbol), {}, { validateResult: false, });
        } catch (e) {
            quotes = e.result;
        }
        const promises: Promise<any>[] = [];
        if (quotes !== undefined) {
            for (const quote of quotes) {
                const i = q.findIndex(
                    (p) => p.symbol == quote.symbol
                );
                if ((i !== -1) && (q[i].stock.contract.currency == quote.currency)) q[i].quote = quote;
            }
            for (const r of q) {
                if (r.quote !== undefined) {
                    if (r.stock.contract.updatedAt < r.quote?.regularMarketTime) {
                        // we got newer prices
                        const stock_prices = {
                            price: r.quote?.regularMarketPrice || null,
                            ask: r.quote?.ask || null,
                            bid: r.quote?.bid || null,
                            previousClosePrice: r.quote?.regularMarketPreviousClose || null,
                            updatedAt: r.quote.regularMarketTime,
                        };
                        promises.push(Stock.update(stock_prices, { where: { id: r.stock.id, }, }));
                    }
                    const stock_values = {
                    };
                    promises.push(Stock.update(stock_values, { where: { id: r.stock.id, }, }));
                    const values = {
                        fiftyTwoWeekLow: r.quote?.fiftyTwoWeekLow || null,
                        fiftyTwoWeekHigh: r.quote?.fiftyTwoWeekHigh || null,
                    };
                    promises.push(Contract.update(values, { where: { id: r.stock.id, }, }));
                }
            }
        }
        await Promise.all(promises);
    }

    private findStocks(limit: number): Promise<Stock[]> {
        return Stock.findAll({
            include: {
                association: "contract",
                model: Contract,
                required: true,
                where: {
                    exchange: {
                        [Op.ne]: "VALUE",  // Contracts that are not tradable (removed, merges, ...) are on VALUE exchange 
                    },
                },
            },
            limit: limit,
            logging: console.log,
        });
    }

    private async history(): Promise<void> {
        console.log("YahooUpdateBot history begin");

        await this.findStocks(BATCH_SIZE_YAHOO_PRICE)
            .then((opts) => this.fetchContractsHistory(opts));

        setTimeout(() => this.emit("history"), 4 * 3600 * 1000);    // update every 4  hours
        console.log("YahooUpdateBot history end");
    }

    public async start(): Promise<void> {
        this.on("process", this.process);
        this.on("history", this.history);
        yahooFinance.setGlobalConfig({ validation: { logErrors: true } });
        this.printObject(await yahooFinance.quote("SPY"));
        setTimeout(() => this.emit("process"), 1 * 60 * 1000);  // start after 1 min
        setTimeout(() => this.emit("history"), 10 * 1000);  // start after 10 secs
    }

}