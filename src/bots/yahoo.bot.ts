import { OptionType, SecType } from "@stoqey/ib";
import { Op } from "sequelize";
import { ExtendedCookieJar, default as yahooFinance } from "yahoo-finance2";
import { ITradingBot } from ".";
import { greeks, option_implied_volatility } from "../black_scholes";
import logger, { LogLevel } from "../logger";
import { AnyContract, Contract, Currency, OptionContract, StockContract } from "../models";
// import { Quote } from "./node_modules/yahoo-finance2/dist/cjs/src/modules/quote.d.ts";
type Quote = Record<string, any>; // using Record<string, any> as a workaround for missing types in yahoo-finance2

const MODULE = "YahooBot";

const YAHOO_PRICE_FREQ: number = parseInt(process.env.YAHOO_PRICE_FREQ || "15") || 15; // secs
const YAHOO_PRICE_AGE: number = parseInt(process.env.YAHOO_PRICE_FREQ || "60") || 60; // mins
const BATCH_SIZE_YAHOO_PRICE: number = parseInt(process.env.BATCH_SIZE_YAHOO_PRICE || "512") || 512; // units
const NO_RISK_INTEREST_RATE: number = parseFloat(process.env.NO_RISK_INTEREST_RATE || "0.045") || 0.025; // as of 2022-07-28

interface MappedQuote {
  contract: Contract;
  symbol: string;
  quote?: Quote;
}

interface Row {
  price: number | null;
  ask: number | null;
  bid: number | null;
  previousClosePrice?: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyTwoWeekHigh: number | null;
  updatedAt: Date;
}

export class YahooUpdateBot extends ITradingBot {
  private requestsQ: MappedQuote[] = [];
  private lastFetch = 0;

  public async enqueueContract(contract: AnyContract): Promise<void> {
    let quote: MappedQuote | undefined = undefined;
    if (contract instanceof Contract) {
      contract.changed("price", true);
      await contract.update(
        { ask: null, bid: null, price: null, previousClosePrice: null },
        {
          logging: console.log,
        },
      );
      // VALUE is no more tradable, CME not supported by Yahoo?, LSE no more supported by Yahoo?
      // if (contract.exchange == "VALUE" || contract.exchange == "CME" || contract.currency != "USD") return;
      if (contract.secType == SecType.STK) {
        if (contract.exchange == "VALUE") return;
        quote = { contract, symbol: YahooUpdateBot.getYahooTicker(contract) };
      } else if (contract.secType == SecType.OPT) {
        const option: OptionContract | null = await OptionContract.findByPk(contract.id);
        quote = { contract, symbol: YahooUpdateBot.formatOptionName(option!) };
      } else if (contract.secType == SecType.CASH) {
        quote = {
          contract,
          symbol: contract.symbol.substring(0, 3) + contract.currency + "=X",
        };
      } else {
        this.error("enqueueContract unhandled contract type (1)");
      }
    } else if (contract instanceof StockContract) {
      quote = {
        contract: contract.contract,
        symbol: YahooUpdateBot.getYahooTicker(contract.contract),
      };
    } else if (contract instanceof OptionContract) {
      quote = {
        contract: contract.contract,
        symbol: YahooUpdateBot.formatOptionName(contract),
      };
    } else {
      this.error("enqueueContract unhandled contract type (2)");
    }
    if (quote) {
      const index = this.requestsQ.findIndex((p) => p.symbol == quote!.symbol);
      if (index < 0) {
        this.requestsQ.push(quote);
      }
    }
  }

  protected static getYahooTicker(contract: Contract): string {
    let $ticker: string = contract.symbol.replace("-PR", "-P").replace(" B", "-B");
    const $exchange: string = contract.exchange;
    if ($exchange == "SBF") {
      $ticker = $ticker + ".PA";
    } else if ($exchange == "LSE" || $exchange == "LSEETF") {
      $ticker = ($ticker[$ticker.length - 1] == "." ? $ticker.substring(0, $ticker.length - 1) : $ticker) + ".L";
    } else if ($exchange == "VSE") {
      $ticker = $ticker + ".VI";
    } else if ($exchange == "BVME") {
      $ticker = $ticker + ".MI";
    } else if ($exchange == "TSEJ") {
      $ticker = $ticker + ".T";
    } else if ($exchange == "AEB") {
      $ticker = $ticker + ".AX";
    } else if ($exchange == "FWB" || $exchange == "IBIS" || $exchange == "IBIS2") {
      $ticker = ($ticker[$ticker.length - 1] == "d" ? $ticker.substring(0, $ticker.length - 1) : $ticker) + ".DE";
    } else if ($exchange == "SEHK") {
      $ticker = $ticker + ".HK";
    } else if (["NYSE", "NASDAQ", "SMART", "PINK", "ARCA", "AMEX", "BATS"].includes($exchange)) {
      // no ticker processing
    } else if ($exchange == "MOEX") {
      $ticker = $ticker + ".ME";
    } else if ($exchange == "SGX") {
      $ticker = $ticker + ".SI";
    } else if ($exchange == "ENEXT.BE") {
      $ticker = $ticker + ".BR";
    } else if ($exchange == "GLOBEX") {
      $ticker = $ticker + "=F";
      // currency selection should come after
    } else if ($exchange == "TSE" || contract.currency == "CAD") {
      $ticker = $ticker.replace(".", "-") + ".TO";
    } else if ($exchange == "EBS" || contract.currency == "CHF") {
      $ticker = $ticker + ".SW";
    } else {
      console.log("warning: unknow exchange", $exchange, "for", contract.symbol);
    }
    return $ticker;
  }

  protected static formatOptionName(option: OptionContract): string {
    const lastTradeDateOrContractMonth: string = option.lastTradeDate;
    const year = lastTradeDateOrContractMonth.substring(2, 4);
    const month = lastTradeDateOrContractMonth.substring(5, 7);
    const day = lastTradeDateOrContractMonth.substring(8, 10);
    const datestr: string = year + month + day;
    let strike: string = (option.strike * 1000).toString();
    while (strike.length < 8) strike = "0" + strike;
    const name = `${option.stock.symbol}${datestr}${option.callOrPut}${strike}`;
    return name;
  }

  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  private async iterateResults(q: MappedQuote[]): Promise<void[]> {
    const promises: Promise<void>[] = [];
    for (const r of q) {
      if (r.quote !== undefined) {
        if (r.quote?.currency == "GBp") {
          r.quote.regularMarketPrice = r.quote?.regularMarketPrice ? r.quote?.regularMarketPrice / 100 : undefined;
          r.quote.ask = r.quote?.ask ? r.quote?.ask / 100 : undefined;
          r.quote.bid = r.quote?.bid ? r.quote?.bid / 100 : undefined;
          r.quote.fiftyTwoWeekLow = r.quote?.fiftyTwoWeekLow ? r.quote?.fiftyTwoWeekLow / 100 : undefined;
          r.quote.fiftyTwoWeekHigh = r.quote?.fiftyTwoWeekHigh ? r.quote?.fiftyTwoWeekHigh / 100 : undefined;
          r.quote.regularMarketPreviousClose = r.quote?.regularMarketPreviousClose
            ? r.quote?.regularMarketPreviousClose / 100
            : undefined;
        }
        const prices: Row = {
          price: r.quote?.regularMarketPrice || null,
          ask: r.quote?.ask || null,
          bid: r.quote?.bid || null,
          fiftyTwoWeekLow: r.quote?.fiftyTwoWeekLow || null,
          fiftyTwoWeekHigh: r.quote?.fiftyTwoWeekHigh || null,
          updatedAt: new Date(),
        };
        if (r.quote?.regularMarketPreviousClose) prices.previousClosePrice = r.quote?.regularMarketPreviousClose;
        r.contract.changed("price", true);
        promises.push(r.contract.update(prices).then());
        if (r.contract.secType == SecType.STK) {
          const stock_values = {
            epsTrailingTwelveMonths: r.quote.epsTrailingTwelveMonths,
            epsForward: r.quote.epsForward,
            trailingAnnualDividendRate: r.quote.trailingAnnualDividendRate,
          };
          promises.push(StockContract.update(stock_values, { where: { id: r.contract.id } }).then());
        } else if (r.contract.secType == SecType.OPT) {
          promises.push(
            OptionContract.findByPk(r.contract.id, {
              include: { as: "stock", model: Contract, required: true },
            })
              .then(async (option) =>
                Contract.findByPk(option.stock.id, {}).then(async (stock) => {
                  let iv_: number | undefined = undefined;
                  if (r.quote?.regularMarketPrice > 0) {
                    try {
                      iv_ = option_implied_volatility(
                        option.callOrPut == OptionType.Call,
                        stock.livePrice,
                        option.strike,
                        NO_RISK_INTEREST_RATE,
                        (option.dte + 1) / 365,
                        r.quote?.regularMarketPrice as number,
                      );
                    } catch (_e: unknown) {
                      await StockContract.findByPk(option.stock.id).then((stock) => {
                        iv_ = stock.historicalVolatility;
                      });
                    }
                  }
                  if (iv_) {
                    const greeks_ = greeks(
                      option.callOrPut == OptionType.Call,
                      stock.livePrice,
                      option.strike,
                      NO_RISK_INTEREST_RATE,
                      (option.dte + 1) / 365,
                      iv_,
                    );
                    const values = {
                      impliedVolatility: iv_,
                      delta: greeks_.delta,
                      gamma: greeks_.gamma,
                      theta: greeks_.theta / 365,
                      vega: greeks_.vega / 100,
                    };
                    // if (option.delta) {
                    //     this.printObject(option);
                    //     this.printObject(values);
                    // }
                    return option?.update(values);
                  }
                  return option;
                }),
              )
              .then(),
          );
        } else if (r.contract.secType == SecType.CASH) {
          promises.push(
            Currency.update(
              { rate: r.quote?.regularMarketPrice },
              {
                where: {
                  base: r.symbol.substring(0, 3),
                  currency: r.symbol.substring(3, 6),
                } /* logging: console.log, */,
              },
            ).then(),
          );
        }
      } else {
        // console.log("no Yahoo quote for:", r.symbol);
        logger.log(LogLevel.Debug, MODULE + ".iterateResults", "no Yahoo quote for:", r.symbol, r);
        // r.contract.changed("updatedAt", true);
        // promises.push(
        //   r.contract
        //     .update(
        //       { ask: undefined, bid: undefined },
        //       {
        //          logging: console.log,
        //       },
        //     )
        //     .then(),
        // );
      }
    }
    return Promise.all(promises);
  }

  private async fetchQuotes(q: MappedQuote[]): Promise<MappedQuote[]> {
    console.log(`fetchQuotes ${q.length} items`);
    if (q.length) {
      this.lastFetch = Date.now();
      let quotes: Quote[];
      try {
        quotes = await yahooFinance.quote(
          q.map((a) => a.symbol),
          {},
          { validateResult: false },
        );
      } catch (e: any) {
        quotes = e.result;
      }
      if (quotes !== undefined) {
        for (const quote of quotes) {
          const i = q.findIndex((p) => p.symbol == quote.symbol);
          if (i !== -1 && q[i].contract.currency == quote.currency) q[i].quote = quote;
        }
      }
    }
    return q;
  }

  private async findCurrencies(limit: number): Promise<MappedQuote[]> {
    const now: number = Date.now();
    return Contract.findAll({
      where: {
        secType: SecType.CASH,
        updatedAt: {
          [Op.lt]: new Date(now - YAHOO_PRICE_AGE * 60 * 1000),
        },
      },
      order: [["updatedAt", "ASC"]],
      limit: limit,
      // logging: console.log,
    }).then((currencies) => {
      const p: MappedQuote[] = [];
      for (const currency of currencies) {
        p.push({
          contract: currency,
          symbol: currency.symbol.substring(0, 3) + currency.currency + "=X",
        });
      }
      return p;
    });
  }

  private async findStocks(limit: number): Promise<MappedQuote[]> {
    const now: number = Date.now();
    return StockContract.findAll({
      include: {
        association: "contract",
        model: Contract,
        required: true,
        where: {
          exchange: {
            [Op.ne]: "VALUE", // Contracts that are not tradable (removed, merges, ...) are on VALUE exchange
          },
          updatedAt: {
            [Op.or]: {
              [Op.lt]: new Date(now - YAHOO_PRICE_AGE * 60 * 1000),
              [Op.is]: null,
            },
          },
        },
      },
      order: [["contract", "updatedAt", "ASC"]],
      limit: limit,
      // logging: console.log,
    }).then((stocks) => {
      const p: MappedQuote[] = [];
      for (const stock of stocks) {
        p.push({
          contract: stock.contract,
          symbol: YahooUpdateBot.getYahooTicker(stock.contract),
        });
      }
      return p;
    });
  }

  private async findOptions(limit: number): Promise<MappedQuote[]> {
    const now: number = Date.now();
    return OptionContract.findAll({
      where: {
        lastTradeDate: {
          // [Op.gt]: new Date(now + (7 * 1440 * 60 * 1000)),   // don't update short term options as their price should be real time updated
          [Op.gte]: new Date(now), // don't update expired contracts
        },
      },
      include: [
        {
          model: Contract,
          as: "contract",
          required: true,
          where: {
            updatedAt: {
              [Op.or]: {
                [Op.lt]: new Date(now - YAHOO_PRICE_AGE * 60 * 1000), // Yahoo quotes delayed by 20 mins
                [Op.is]: null,
              },
            },
            currency: "USD",
            exchange: {
              [Op.ne]: "VALUE", // Contracts that are not tradable (removed, merges, ...) are on VALUE exchange
            },
          },
        },
        {
          model: Contract,
          as: "stock",
          required: true,
          // include: [Contract],
        },
      ],
      order: [
        ["lastTradeDate", "DESC"],
        ["contract", "updatedAt", "ASC"],
      ],
      limit: limit,
      // logging: console.log,
    }).then((options) => {
      const p: MappedQuote[] = [];
      for (const option of options) {
        p.push({
          contract: option.contract,
          symbol: YahooUpdateBot.formatOptionName(option),
        });
      }
      return p;
    });
  }

  public async processQ(): Promise<void> {
    if (Date.now() - this.lastFetch < YAHOO_PRICE_FREQ * 1000) return Promise.resolve();
    console.log("YahooUpdateBot processQ begin");
    const contracts: MappedQuote[] = this.requestsQ.splice(0, BATCH_SIZE_YAHOO_PRICE);
    return this.fetchQuotes(contracts)
      .then(async (q) => this.iterateResults(q))
      .then(() => console.log("YahooUpdateBot processQ end"));
  }

  protected async process(): Promise<void> {
    console.log("YahooUpdateBot process begin");
    // console.log(Date.now(), this.lastFetch, (Date.now() - this.lastFetch));
    if (Date.now() - this.lastFetch > YAHOO_PRICE_FREQ * 1000) {
      let contracts: MappedQuote[] = [];
      contracts = this.requestsQ.splice(0, BATCH_SIZE_YAHOO_PRICE);
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
      await this.fetchQuotes(contracts).then(async (q) => this.iterateResults(q));
    }
    setTimeout(() => this.emit("process"), (YAHOO_PRICE_FREQ * 1000) / 2);
    console.log("YahooUpdateBot process end");
  }

  public processWrapper(): void {
    this.process().catch((error) => console.error(error));
  }

  public start(): void {
    this.on("process", () => this.processWrapper());

    const cookieJar = new ExtendedCookieJar();
    yahooFinance.setGlobalConfig({ validation: { logErrors: true }, cookieJar });
    // this.printObject(await yahooFinance.quote("EURUSD=X"));

    setTimeout(() => this.emit("process"), 1 * 60 * 1000); // start after 1 min
  }
}
