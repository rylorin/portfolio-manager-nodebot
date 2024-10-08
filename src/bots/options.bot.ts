import { IBApiNextError, Contract as IbContract, OptionType, SecType } from "@stoqey/ib";
import { SecurityDefinitionOptionParameterType } from "@stoqey/ib/dist/api-next";
import { Op, QueryTypes } from "sequelize";
import { ITradingBot } from ".";
import { greeks, option_implied_volatility } from "../black_scholes";
import { Contract, OptionContract, StockContract } from "../models";
import { expirationToDate } from "../models/date_utils";

const OPTIONS_LIST_BUILD_FREQ: number = process.env.OPTIONS_LIST_BUILD_FREQ
  ? parseInt(process.env.OPTIONS_LIST_BUILD_FREQ)
  : 24; // hours
const OPTIONS_PRICE_TIMEFRAME: number = process.env.OPTIONS_PRICE_TIMEFRAME
  ? parseInt(process.env.OPTIONS_PRICE_TIMEFRAME)
  : 180; // days
const NO_RISK_INTEREST_RATE: number = process.env.NO_RISK_INTEREST_RATE
  ? parseFloat(process.env.NO_RISK_INTEREST_RATE)
  : 0.05;

export class OptionsCreateBot extends ITradingBot {
  private async iterateSecDefOptParamsForExpStrikes(
    stock: Contract,
    expirations: string[],
    strikes: number[],
  ): Promise<void> {
    // console.log(`iterateSecDefOptParamsForExpStrikes for ${stock.symbol}, ${expirations.length} exp, ${strikes.length} strikes`)
    for (const expstr of expirations) {
      const expdate = expirationToDate(expstr);
      const days = (expdate.getTime() - Date.now()) / 60000 / 1440;
      if (days > 0 && days < OPTIONS_PRICE_TIMEFRAME) {
        console.log(stock.symbol, expstr, days, "days", strikes.length, "strikes");
        for (const strike of strikes) {
          // console.log("iterateSecDefOptParamsForExpStrikes", stock.symbol, expstr, strike);
          const ibContract: IbContract = {
            secType: SecType.OPT,
            symbol: stock.symbol,
            currency: stock.currency,
            lastTradeDateOrContractMonth: expstr,
            strike: strike,
          };
          await this.findOrCreateContract({
            ...ibContract,
            ...{ right: OptionType.Put },
          })
            .catch(() => {
              /* silently ignore any error */
            })
            .then(async () =>
              this.findOrCreateContract({
                ...ibContract,
                ...{ right: OptionType.Call },
              }),
            )
            .catch(() => {
              /* silently ignore any error */
            });
          // const put = this.findOrCreateContract({ ...ibContract, ...{ right: OptionType.Put } })
          //     .catch(() => {
          //         /* silently ignore any error */
          //         return Promise.resolve(null as Contract);
          //     });
          // const call = this.findOrCreateContract({ ...ibContract, ...{ right: OptionType.Call } })
          //     .catch(() => {
          //         /* silently ignore any error */
          //         return Promise.resolve(null as Contract);
          //     });
          // await Promise.all([put, call]);
        }
      }
    }
    // return Promise.resolve();
  }

  private async iterateSecDefOptParams(
    stock: Contract,
    details: SecurityDefinitionOptionParameterType[],
  ): Promise<void> {
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

  private async requestSecDefOptParams(stock: Contract): Promise<SecurityDefinitionOptionParameterType[]> {
    console.log(`requestSecDefOptParams: ${stock.symbol} ${stock.conId}`);
    return this.api
      .getSecDefOptParams(
        stock.symbol,
        "", // exchange but only empty string returns results
        stock.secType as SecType,
        stock.conId,
      )
      .catch((err: IBApiNextError) => {
        console.log(`getSecDefOptParams failed with '${err.error.message}'`);
        throw err.error;
      });
  }

  private async iterateToBuildOptionList(contracts: Contract[]): Promise<void> {
    console.log(`iterateToBuildOptionList ${contracts.length} items`);
    return contracts.reduce(async (p, stock) => {
      return p.then(async () => {
        console.log(
          `iterateToBuildOptionList ${stock.symbol} ${stock["options_age"] * 24} vs ${OPTIONS_LIST_BUILD_FREQ}`,
        );
        if (stock["options_age"] * 24 > OPTIONS_LIST_BUILD_FREQ) {
          console.log("iterateToBuildOptionList: option contracts list need refreshing");
          return this.findOrCreateContract(stock as IbContract).then(async (contract) =>
            this.requestSecDefOptParams(contract).then(async (params) => this.iterateSecDefOptParams(contract, params)),
          );
        }
        return Promise.resolve();
      });
    }, Promise.resolve()); // initial
  }

  private async findStocksToListOptions(): Promise<Contract[]> {
    return this.app.sequelize.query(
      `
        SELECT
          (julianday('now') - MAX(julianday(IFNULL(option.createdAt, '2022-01-01')))) options_age,
          contract.symbol, contract.con_id conId, contract.id id, contract.currency currency, contract.secType secType,
          contract.createdAt, MAX(option.createdAt)
        FROM option, contract, trading_parameters
        WHERE contract.id = option.stock_id
          AND contract.exchange != 'VALUE'
          AND trading_parameters.stock_id =  option.stock_id
        GROUP BY option.stock_id
        ORDER BY options_age DESC
          `,
      {
        model: Contract,
        raw: true,
        type: QueryTypes.SELECT,
        // logging: console.log,
      },
    );
  }

  private buildOptionsList(): void {
    console.log("buildOptionsList");
    this.findStocksToListOptions()
      .then(async (stocks) => this.iterateToBuildOptionList(stocks))
      .then(() => setTimeout(() => this.emit("buildOptionsList"), 4 * 3600 * 1000))
      .catch((error) => console.log("option bot:", error));
  }

  private async updateGreeks(): Promise<void> {
    console.log("updateGreeks");
    const stocks: StockContract[] = await StockContract.findAll({
      include: {
        model: Contract,
        association: "contract",
        required: true,
        where: {
          exchange: {
            [Op.ne]: "VALUE", // Contracts that are not tradable (removed, merges, ...) are on VALUE exchange
          },
        },
      },
      order: [["contract", "symbol", "ASC"]],
      // logging: console.log,
    });
    for (const stock of stocks) {
      console.log(stock.contract.symbol);
      const options: OptionContract[] = await OptionContract.findAll({
        where: {
          stock_id: stock.id,
          updatedAt: {
            [Op.or]: [
              undefined,
              {
                [Op.lt]: stock.contract.updatedAt,
              },
              {
                [Op.lt]: this.app.sequelize.col("contract.updatedAt"),
              },
            ],
          },
          [Op.or]: [{ pvDividend: 0 }, { pvDividend: null }],
        },
        include: {
          model: Contract,
          required: true,
        },
        // logging: console.log,
      });
      const promises: Promise<void>[] = [];
      for (const option of options) {
        if (option.dte >= 0) {
          let iv_: number | undefined;
          if (stock.contract.livePrice) {
            try {
              iv_ = option_implied_volatility(
                option.callOrPut == OptionType.Call,
                stock.contract.livePrice,
                option.strike,
                NO_RISK_INTEREST_RATE,
                (option.dte + 1) / 365,
                option.contract.livePrice,
              );
            } catch (_e: unknown) {
              iv_ = stock.historicalVolatility;
            }
          }
          if (iv_) {
            const greeks_ = greeks(
              option.callOrPut == OptionType.Call,
              stock.contract.livePrice,
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
            promises.push(option.update(values).then());
          }
        } else {
          const prices = {
            price: null,
            ask: null,
            bid: null,
          };
          const values = {
            impliedVolatility: null,
            delta: null,
            gamma: null,
            theta: null,
            vega: null,
            pvDividend: null,
          };
          promises.push(option.contract.update(prices).then());
          promises.push(option.update(values).then());
        }
      }
      await Promise.all(promises);
    }

    console.log("updateGreeks done.");
    setTimeout(() => this.emit("updateGreeks"), 10 * 60 * 1000); // come back after 10 mins and check again
  }

  public updateGreeksWrapper(): void {
    this.updateGreeks().catch((error) => console.error(error));
  }
  public start(): void {
    this.on("buildOptionsList", () => this.buildOptionsList());
    this.on("updateGreeks", () => this.updateGreeksWrapper());

    setTimeout(() => this.emit("buildOptionsList"), 0 * 60 * 1000); // start after 10 mins
    // setTimeout(() => this.emit("updateGreeks"), 1 * 60 * 1000);   // start after 1 min
  }
}
