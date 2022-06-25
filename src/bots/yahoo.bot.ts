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
                    updatedAt: Date.now(),  // force update
                };
                promises.push(Contract.update(values, { where: { id: r.id, }, }));
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
            logging: console.log,
        });
    }

    private async process(): Promise<void> {
        console.log("YahooUpdateBot process begin");

        await this.findOptionsToUpdatePrice(BATCH_SIZE_YAHOO_PRICE)
            .then((opts) => this.fetchContractsPrices(opts));

        setTimeout(() => this.emit("process"), YAHOO_PRICE_FREQ * 1000);
        console.log("YahooUpdateBot process end");
    }

    public async start(): Promise<void> {
        this.on("process", this.process);
        yahooFinance.setGlobalConfig({ validation: { logErrors: true } });
        // this.printObject(await yahooFinance.quote("QQQ230616P00475000"));
        setTimeout(() => this.emit("process"), 10 * 1000);  // start after 1 min
    }

}