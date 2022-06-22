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

const YAHOO_PRICE_FREQ: number = parseInt(process.env.YAHOO_PRICE_FREQ) || 1;                  // mins
const BATCH_SIZE_YAHOO_PRICE: number = parseInt(process.env.BATCH_SIZE_YAHOO_PRICE) || 512;    // units

export class YahooUpdateBot extends ITradingBot {

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

    private iterateYahooResults(quotes: Quote[]): Promise<any> {
        console.log(`iterateYahooResults ${quotes.length} items`);
        return quotes.reduce((p, quote) => {
            return p.then(() => {
                let ibContract: IbContract = undefined;
                if (quote.quoteType == "OPTION") {
                    const p: number = quote.symbol.indexOf("2");    // will work up to 2030
                    const right: OptionType = quote.symbol.substring(p).substring(6, 7) as OptionType;
                    const strike: number = quote.strike || parseInt(quote.symbol.substring(p).substring(7)) / 1000;  // strike is sometimes missing! :<
                    ibContract = {
                        secType: SecType.OPT,
                        symbol: quote.underlyingSymbol,
                        currency: quote.currency,
                        right: right,
                        strike: strike,
                        lastTradeDateOrContractMonth: ITradingBot.dateToExpiration(new Date(quote.expireDate)),
                    };
                }
                const values = {
                    price: quote.regularMarketPrice || null,
                    ask: quote.ask || null,
                    bid: quote.bid || null,
                    previousClosePrice: quote.regularMarketPreviousClose || null,
                };
                if (ibContract) {
                    this.printObject(ibContract);
                    return this.findOrCreateContract(ibContract)
                        .then((contract) => Contract.update(values, { where: { id: contract.id, }, }));
                } else {
                    return Promise.resolve();
                }
            });
        }, Promise.resolve()); // initial
    }

    private async fetchContractsPrices(opts: Option[]) {
        console.log(`fetchContractsPrices ${opts.length} items`);
        let q: { id: number, symbol: string, quote: Quote }[] = [];
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
        for (const quote of quotes) {
            const i = q.findIndex(
                (p) => p.symbol == quote.symbol
            );
            if (i !== -1) q[i].quote = quote;
        }
        const promises: Promise<any>[] = [];
        for (const r of q) {
            const values = {
                price: r.quote?.regularMarketPrice || null,
                ask: r.quote?.ask || null,
                bid: r.quote?.bid || null,
                previousClosePrice: r.quote?.regularMarketPreviousClose || null,
            };
            promises.push(Contract.update(values, { where: { id: r.id, }, }));
        }
        await Promise.all(promises);
    }

    private findOptionsToUpdatePrice(limit: number): Promise<Option[]> {
        const now: number = Date.now();
        return Option.findAll({
            where: {
                lastTradeDate: {
                    [Op.gt]: new Date(now + (30 * 1440 * 60 * 1000)),   // don't update short term options as their price should be real time updted
                },
                // stock_id: {
                //     [Op.notIn]: [4614,],  // Skip DISCK - ugly hack :< these options should be deleted from db
                // },
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
        // .then((r) => this.iterateYahooResults(r));

        setTimeout(() => this.emit("process"), YAHOO_PRICE_FREQ * 60 * 1000);
        console.log("YahooUpdateBot process end");
    }

    public async start(): Promise<void> {
        this.on("process", this.process);
        yahooFinance.setGlobalConfig({ validation: { logErrors: true } });
        // this.printObject(await yahooFinance.quote("QQQ230616P00475000"));
        setTimeout(() => this.emit("process"), 10 * 1000);  // start after 1 min
    }

}