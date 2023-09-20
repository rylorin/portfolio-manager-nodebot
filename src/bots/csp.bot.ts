import { OptionType, OrderAction } from "@stoqey/ib";
import { Op } from "sequelize";
import { ITradingBot } from ".";
import logger from "../logger";
import { Contract, OpenOrder, Option, Position, Setting, Stock } from "../models";

const MODULE = "CspBot";

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
const _sequelize_logging = (...args: any[]): void => logger.trace(MODULE + ".squelize", ...args);

const CSP_FREQ: number = parseInt(process.env.CSP_FREQ || "10"); // mins

interface OptionEx extends Option {
  yield?: number;
}

type Row = {
  symbol: string;
  engaged_options: number;
  options: Option[];
};

export class SellCashSecuredPutBot extends ITradingBot {
  private async sumOptionsPositionsAmount(
    positions: Position[],
    underlying: number,
    right: OptionType,
  ): Promise<number> {
    let result = 0;
    for (const position of positions) {
      const opt = await Option.findOne({
        where: {
          id: position.contract.id,
          callOrPut: right,
          stock_id: underlying,
        },
      });
      if (opt !== null) result += position.quantity * opt.multiplier * opt.strike;
    }
    return result;
  }

  private async sumOptionsOrders(orders: OpenOrder[], underlying: number, right: OptionType): Promise<number> {
    let result = 0;
    for (const order of orders) {
      const opt = await Option.findOne({
        where: {
          id: order.contract.id,
          stock_id: underlying,
          callOrPut: right,
        },
      });
      if (opt !== null) result += order.remainingQty * opt.multiplier;
    }
    return result;
  }

  private async processOneParamaeter(parameter: Setting): Promise<Row> {
    console.log("processing parameter:", parameter.underlying.symbol);

    const stock_positions = await this.getContractPositionValueInBase(parameter.underlying);
    const stock_orders = await this.getContractOrderValueInBase(parameter.underlying);
    const call_positions = await this.getOptionsPositionsSynthesisInBase(
      parameter.underlying.id,
      OptionType.Call,
      true,
    ).then((r) => r.value);
    const call_sell_orders = 0; // not relevant

    const put_positions = await this.getOptionsPositionsSynthesisInBase(parameter.underlying.id, OptionType.Put).then(
      (r) => r.engaged,
    );
    const put_sell_orders = await this.getOptionsOrdersEngagedInBase(
      parameter.underlying.id,
      OptionType.Put,
      OrderAction.SELL,
    );

    const engaged_options = -(put_positions + put_sell_orders);
    const engaged_symbol = stock_positions + stock_orders + call_positions + call_sell_orders + engaged_options;

    if (stock_positions) console.log("stock_positions_amount in base:", Math.round(stock_positions));
    if (stock_orders) console.log("stock_orders amount in base:", Math.round(stock_orders));
    if (call_positions) console.log("call_positions value in base:", Math.round(call_positions));
    if (call_sell_orders) console.log("call_sell_orders risk in base:", Math.round(call_sell_orders));
    if (put_positions) console.log("put_positions engaged in base:", Math.round(put_positions));
    if (put_sell_orders) console.log("put_sell_orders engaged in base:", Math.round(put_sell_orders));
    console.log("=> engaged:", Math.round(engaged_symbol), Math.round(engaged_options));

    const max_for_this_symbol =
      ((await this.getContractPositionValueInBase(this.portfolio.benchmark)) + (await this.getTotalBalanceInBase())) *
      parameter.navRatio;
    console.log("max for this symbol:", Math.round(max_for_this_symbol));
    const free_for_this_symbol = max_for_this_symbol - engaged_symbol;
    console.log("free_for_this_symbol in base:", Math.round(free_for_this_symbol));
    console.log("parameter.underlying.price:", parameter.underlying.livePrice);
    console.log(
      "free_for_this_symbol in currency:",
      Math.round(free_for_this_symbol * this.base_rates[parameter.underlying.currency]),
    );
    // RULE 7: stock price is lower than previous close
    const options =
      parameter.underlying.livePrice > parameter.underlying.previousClosePrice
        ? []
        : await Option.findAll({
            where: {
              stock_id: parameter.underlying.id,
              strike: {
                [Op.lt]: Math.min(parameter.underlying.livePrice, free_for_this_symbol / 100), // RULE 2 & 5: strike < cours (OTM) & max ratio per symbol
              },
              lastTradeDate: { [Op.gt]: new Date() },
              callOrPut: OptionType.Put,
              delta: {
                [Op.gt]: this.portfolio.cspWinRatio - 1, // RULE 3: delta >= -0.2
              },
            },
            include: [
              {
                required: true,
                model: Contract,
                as: "contract",
                where: {
                  bid: {
                    [Op.gte]: this.portfolio.minPremium, // RULE 4: premium (bid) >= 0.25$
                  },
                },
              },
              {
                required: true,
                model: Contract,
                as: "stock",
              },
            ],
            // logging: console.log,
          });
    console.log(".");
    return { symbol: parameter.underlying.symbol, engaged_options, options };
  }

  private async iterateParameters(parameters: Setting[]): Promise<void> {
    const result: Row[] = [];
    for (const parameter of parameters) {
      result.push(await this.processOneParamaeter(parameter));
    }
    const total_engaged = result.reduce((p, v) => p + v.engaged_options, 0);

    const invest_base =
      (await this.getTotalBalanceInBase()) +
      (await this.getContractPositionValueInBase(this.portfolio.benchmark)) +
      (await this.getOptionShortPositionsValueInBase(this.portfolio.benchmark.id, OptionType.Call));
    const max_for_all_symbols = invest_base * this.portfolio.putRatio - total_engaged;
    console.log(
      "max_for_all_symbols:",
      max_for_all_symbols,
      "invest_base:",
      invest_base,
      "total_engaged:",
      total_engaged,
    );

    const all_options: OptionEx[] = result.reduce((p, v) => [...p, ...v.options], [] as OptionEx[]);
    const filtered_options: OptionEx[] = [];
    for (const option of all_options) {
      // RULE 6: check overall margin space
      const stock = await Stock.findByPk(option.stock.id);
      if (option.strike * option.multiplier * this.base_rates[option.contract.currency] < max_for_all_symbols) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion,@typescript-eslint/no-non-null-assertion
        if (option.impliedVolatility > stock!.historicalVolatility) {
          // RULE 1: implied volatility > historical volatility
          // const expiry: Date = new Date(option.lastTradeDate);
          const diffDays = Math.ceil((option.expiryDate.getTime() - Date.now()) / (1000 * 3600 * 24));
          option["yield"] = (option.contract.bid / option.strike / diffDays) * 360;
          // option.stock.contract = await Contract.findByPk(option.stock.id);
          filtered_options.push(option);
        }
      }
    }
    // order by yield
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion,@typescript-eslint/no-non-null-assertion
    filtered_options.sort((a: OptionEx, b: OptionEx) => b.yield! - a.yield!);
    if (filtered_options.length > 0) {
      console.log("filtered_options:", filtered_options.length);
      console.log(filtered_options[0]["yield"]);
      this.printObject(filtered_options[0]);
      if (filtered_options[0].contract.ask)
        await this.api
          .placeNewOrder(
            ITradingBot.OptionToIbContract(filtered_options[0]),
            ITradingBot.CspOrder(OrderAction.SELL, 1, filtered_options[0].contract.ask),
          )
          .then((orderId: number) => {
            console.log("orderid:", orderId.toString());
          });
    }
  }

  private listParameters(): Promise<Setting[]> {
    return Setting.findAll({
      where: {
        cspStrategy: {
          [Op.gt]: 0,
        },
      },
      include: {
        model: Contract,
        required: true,
      },
      // logging: console.log,
    });
  }

  private process(): void {
    console.log("SellCashSecuredPutBot process begin");
    this.listParameters()
      .then((result) => this.iterateParameters(result))
      .then(() => setTimeout(() => this.emit("process"), CSP_FREQ * 60 * 1000))
      .catch((error) => console.error("csp bot process:", error));
  }

  public start(): void {
    this.on("process", () => this.process());
    this.init()
      .then(() => setTimeout(() => this.emit("process"), 6000))
      .catch((error) => console.error("csp bot start:", error));
  }
}
