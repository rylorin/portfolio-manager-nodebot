import { EventEmitter } from 'events';
import { QueryTypes } from 'sequelize';
import {
  Contract as IbContract,
  IBApiNext,
  IBApiNextError,
  BarSizeSetting,
  SecType,
  ContractDetails,
  OptionType,
  Bar,
  TickType
} from "@stoqey/ib";
import { SecurityDefinitionOptionParameterType } from "@stoqey/ib/dist/api-next";
import { MutableMarketData } from "@stoqey/ib/dist/core/api-next/api/market/mutable-market-data";
import { IBApiNextApp } from "@stoqey/ib/dist/tools/common/ib-api-next-app";
import { sequelize, Contract, Stock, Option } from "../models";
import { ITradingBot } from '.';

require('dotenv').config();

const UPDATE_CONID_FREQ: number = parseInt(process.env.UPDATE_CONID_FREQ) || 10;
const HISTORICAL_DATA_REFRESH_FREQ: number = parseInt(process.env.HISTORICAL_DATA_REFRESH_FREQ) || (12 * 60);
const STOCKS_PRICES_REFRESH_FREQ: number = parseInt(process.env.STOCKS_PRICES_REFRESH_FREQ) || 20;
const OPTIONS_LIST_BUILD_FREQ: number = parseInt(process.env.OPTIONS_LIST_BUILD_FREQ) || (24 * 60);
const MAX_PARALLELS_UPDATES: number = parseInt(process.env.MAX_PARALLELS_UPDATES) || 1;

export class UpdaterBot extends EventEmitter implements ITradingBot {

  protected app: IBApiNextApp;
  protected api: IBApiNext;

  constructor(app: IBApiNextApp, api: IBApiNext) {
    super();
    this.app = app;
    this.api = api;
  }

  public start(): void {
    this.on('updateStocksDetails', this.updateStocksDetails);
    this.on('updateHistoricalData', this.updateHistoricalData);
    this.on('updateStocksPrices', this.updateStocksPrices);
    this.on('buildOptionsList', this.buildOptionsList);

    // setTimeout(() => this.emit('updateStocksDetails'), 1000);
    // setTimeout(() => this.emit('updateHistoricalData'), 2000);
    // setTimeout(() => this.emit('updateStocksPrices'), 3000);
    setTimeout(() => this.emit('buildOptionsList'), 4000);
  };

  public stop(): void {};

  private updateContractDetails(id: number, detailstab: ContractDetails[]): Promise<[affectedCount: number]> {
    // console.log(`updateContractDetails got data for contract id ${id}`)
    if (detailstab.length > 1) {
      // this.app.printObject(detailstab);
      // console.log(`Ambigous results from getContractDetails! ${detailstab.length} results for ${detailstab[0].contract.symbol}`)
    }
    let details: ContractDetails = detailstab[0];
    return Contract.update(
      {
        conId: details.contract.conId,
        symbol: details.contract.symbol,
        secType: details.contract.secType,
        exchange: details.contract.primaryExch,
        currency: details.contract.currency,
        name: details.longName,
      } as Contract, {
      where: {
        id: id,
      }
    });
  }

  private requestContractDetails(contract: IbContract): Promise<ContractDetails[]> {
    // console.log(`requestContractDetails for contract ${contract.symbol}`)
    return this.api
      .getContractDetails(contract)
      .catch((err: IBApiNextError) => {
        console.log(`getContractDetails failed for ${contract.symbol} with '${err.error.message}'`);
        throw err;
      });
  }

  private iterateContractsForDetails(contracts: Contract[]): Promise<any> {
    return contracts.reduce((p, contract) => {
      return p.then(() => this.requestContractDetails(contract)
        .then((detailstab) => this.updateContractDetails(contract.id, detailstab))
        .catch((err) => {
          // silently ignore any error
        }));
    }, Promise.resolve()); // initial
  }

  private findStocksWithoutConId(): Promise<Contract[]> {
    return sequelize.query(`
      SELECT
        contract.*
      FROM contract
      WHERE contract.con_id ISNULL
        AND contract.secType = 'STK'
      `,
      {
        model: Contract,
        mapToModel: true, // pass true here if you have any mapped fields
        logging: console.log,
      }
    );
  }

private async updateStocksDetails(): Promise<void> {
    console.log('updateStocksDetails begin');
    await this
      .findStocksWithoutConId()
      .then((contracts) => this.iterateContractsForDetails(contracts));
    console.log('updateStocksDetails done');
    setTimeout(() => this.emit('updateStocksDetails'), UPDATE_CONID_FREQ * 60000);
    return Promise.resolve();
  };

  private updateHistoricalVolatility(id: number, bars: Bar[]): Promise<[affectedCount: number]> {
    let histVol: number = bars[bars.length-1].close;
    // console.log(`updateHistoricalVolatility got ${histVol} for contract id ${id}`)
    return Stock.update({
        historicalVolatility: histVol
      }, {
        where: {
          id: id
        }
      }
    );
  }

  private requestHistoricalVolatility(contract: Contract): Promise<any> {
    // console.log(`requestHistoricalVolatility for contract ${contract.symbol}`)
    return this.api
    .getHistoricalData(
      {
        conId: contract.conId as number ?? undefined,
        symbol: contract.symbol as string,
        secType: contract.secType as SecType,
        exchange: 'SMART',
        currency: contract.currency as string,
      },
      '', "2 D", BarSizeSetting.DAYS_ONE,
      "HISTORICAL_VOLATILITY",
      0, 1
    ).catch((err: IBApiNextError) => {
      console.log(`getHistoricalData failed with '${err.error.message}'`);
      throw err;
    })
  }

  private iterateContractsForHistoricalVolatility(contracts: Contract[]): Promise<any> {
    return contracts.reduce((p, contract) => {
      return p.then(() => this.requestHistoricalVolatility(contract)
        .then((bars) => this.updateHistoricalVolatility(contract.id, bars))
        .catch((err: IBApiNextError) => {
          // this.app.error(`getHistoricalData failed with '${err.error.message}'`);
        }));
    }, Promise.resolve()); // initial
  }

  private findStocksNeedingHistoricalData(): Promise<Contract[]> {
    // stock.historical_volatility is not needed below be we like to eventually display it in debug logs
    return sequelize.query(`
      SELECT
          DISTINCT(contract.symbol),
          stock.historical_volatility,
          contract.*
        FROM trading_parameters, contract, stock
        WHERE trading_parameters.stock_id = contract.id
          AND trading_parameters.stock_id = stock.id
        GROUP BY contract.symbol
        ORDER BY contract.updated
        `,
      {
        model: Contract,
        mapToModel: true, // pass true here if you have any mapped fields
        logging: console.log,
      });
  }

  private async updateHistoricalData(): Promise<void> {
    console.log('updateHistoricalData');
    await this.findStocksNeedingHistoricalData()
      .then((contracts) => this.iterateContractsForHistoricalVolatility(contracts));
    console.log('updateHistoricalData done');
    setTimeout(() => this.emit('updateHistoricalData'), HISTORICAL_DATA_REFRESH_FREQ * 60000);
    return Promise.resolve();
  };
  
  private requestStockPrice(contract: Contract): Promise<MutableMarketData> {
    console.log(`requestStockPrice for contract ${contract.symbol}`);
    return this.api
      .getMarketDataSingle(
        {
          conId: contract.conId as number ?? undefined,
          symbol: contract.symbol as string,
          secType: contract.secType as SecType,
          exchange: 'SMART',
          currency: contract.currency as string,
        },
        '', false)
      .catch((err: IBApiNextError) => {
          console.log(`getMarketDataSingle failed with '${err.error.message}'`);
          throw err;
      });
  }

  private updateContratPrice(id: number, marketData: MutableMarketData): Promise<[affectedCount: number]> {
    // this.app.printObject(marketData);
    let bid = {};
    let ask = {};
    let price = {};
    let close = {};
    marketData.forEach((tick, type) => {
      // console.log(type, tick);
      if (type == 1) bid = {
        bid: tick.value,
        bidDate: new Date(tick.ingressTm)
      }
      if (type == 2) ask = {
        ask: tick.value,
        askDate: new Date(tick.ingressTm),
      }
      if (type == 4) price = {
        price: tick.value,
        updated: new Date(tick.ingressTm),
      }
      if (type == 9) close = { previousClosePrice: tick.value };
    });
    console.log(`updateContratPrice got data for contract id ${id}`);
    return Contract.update(
      { ...ask, ...bid, ...price, ...close },
      {
        where: {
          id: id
      }
    });
  }

  private iterateStocksForPriceUpdate(contracts: Contract[]): Promise<any> {
    return contracts.reduce((p, contract) => {
      return p.then(() => this.requestStockPrice(contract)
        .then((marketData) => this.updateContratPrice(contract.id, marketData))
        .catch((err) => {
          // silently ignore any error
        }));
      }, Promise.resolve()); // initial
  }

  private findStocksNeedingPriceUpdate(): Promise<Contract[]> {
    return sequelize.query(`
      SELECT
          DISTINCT(contract.symbol), SUM(trading_parameters.nav_ratio) nav_ratio_sum,
          stock.historical_volatility,
          (julianday('now') - julianday(updated)) age,
          contract.*
        FROM trading_parameters, contract, stock
        WHERE trading_parameters.stock_id = contract.id
          AND trading_parameters.stock_id = stock.id
          AND age > ?
        GROUP BY contract.symbol
        ORDER BY contract.updated
        `,
      {
        model: Contract,
        mapToModel: true, // pass true here if you have any mapped fields
        replacements: [STOCKS_PRICES_REFRESH_FREQ/1440/2],
        logging: console.log,
      });
  }

  private async updateStocksPrices(): Promise<void> {
    console.log('updateStocksPrices');
    await this.findStocksNeedingPriceUpdate()
      .then((contracts) => this.iterateStocksForPriceUpdate(contracts));
    console.log('updateStocksPrices done');
    setTimeout(() => this.emit('updateStocksPrices'), STOCKS_PRICES_REFRESH_FREQ * 60000 / 2);
  };

  private createOptionContract(stock: Contract, expstr: string, strike: number, callOrPut: string): Promise<Option> {
    let exp: Date = new Date(
      parseInt(expstr.substring(0, 4)),
      parseInt(expstr.substring(4, 6)) - 1,
      parseInt(expstr.substring(6, 8)),
    );
    return Contract.create({
      secType: 'OPT',
      symbol: `${stock.symbol} ${expstr} ${strike} P`,
      currency: stock.currency,
    }).then((contract) => {
      return Option.create({
        id: contract.id,
        stock_id: stock.id,
        lastTradeDate: exp,
        expiration: expstr,
        strike: strike,
        callOrPut: 'P',
      })
    })
  }

  private findOrCreateOptionContract(stock: Contract, expstr: string, strike: number, callOrPut: string): Promise<Option> {
    console.log(`findOrCreateOptionContract ${stock.symbol} ${expstr} ${strike} ${callOrPut}`)
    let exp: Date = new Date(
      parseInt(expstr.substring(0, 4)),
      parseInt(expstr.substring(4, 6)) - 1,
      parseInt(expstr.substring(6, 8)),
    );
    return Option.findOne({
        where: {
          stock_id: stock.id,
          lastTradeDate: exp,
          strike: strike,
          right: callOrPut,
        }
      })
      // .then((result) => {
      //   if (result == null) {
      //     return this.createOptionContract(stock, expstr, strike);
      //   } else
      //     return result;
      // });
  }

  private iterateSecDefOptParamsForStrikes(stock: Contract, expiration: string, strikes: number[]): Promise<any> {
    return strikes.reduce((p, strike) => {
      return p.then(() => {
        console.log(`iterateSecDefOptParamsForStrikes ${stock.symbol} ${expiration} ${strike} P`)
        return this.requestContractDetails({
            symbol: stock.symbol,
            secType: 'OPT' as SecType,
            currency: stock.currency,
            lastTradeDateOrContractMonth: expiration,
            strike: strike,
            right: 'P' as OptionType,
          })
          // .then((detailstab) => this.findOrCreateOptionContract(stock, expiration, strike, 'P'))
          // .then((option) => this.updateContractDetails(option.id, detailstab))
          .catch((err: IBApiNextError) => {
              console.log(`getMarketDataSingle failed with '${err.error.message}'`);
              // throw err;
              return Promise.resolve();
          })
        })
      }, Promise.resolve()); // initial
  }

  private iterateSecDefOptParamsForExpStrikes(stock: Contract, expirations: string[], strikes: number[]): Promise<any> {
    return expirations.reduce((p, expiration) => {
        return p.then(() => {
          console.log(`iterateSecDefOptParamsForExpStrikes: ${stock.symbol} ${expiration} for ${strikes.length} strikes`)
          return this.iterateSecDefOptParamsForStrikes(stock, expiration, strikes)
            .catch((err) => {
              // silently ignore error
              return Promise.resolve();
            })
      })
      }, Promise.resolve()); // initial
  }

  private iterateSecDefOptParams(stock: Contract, details: SecurityDefinitionOptionParameterType[]): Promise<any> {
    console.log(`iterateSecDefOptParams: ${stock.symbol} ${details.length} items`)
    return details.reduce((p, detail: SecurityDefinitionOptionParameterType) => {
      return p.then(() => {
        let promise: Promise<any>;
        if (detail.exchange == 'SMART') {
          // this.app.printObject(detail);
          promise = this.iterateSecDefOptParamsForExpStrikes(stock, detail.expirations, detail.strikes)
        } else {
          promise = Promise.resolve();
        }
        return promise;
      }
      )}, Promise.resolve()); // initial
  }

  private requestSecDefOptParams(stock: Contract): Promise<SecurityDefinitionOptionParameterType[]> {
    console.log(`requestSecDefOptParams: ${stock.symbol}`)
    return this.api
      .getSecDefOptParams(
          stock.symbol,
          '', // exchange but only empty string returns results
          'STK' as SecType,
          stock.conId
        )
      .catch((err: IBApiNextError) => {
          console.log(`getSecDefOptParams failed with '${err.error.message}'`);
          throw err;
      });
  }

  private iterateToBuildOptionList(contracts: Contract[]): Promise<any> {
    console.log(`iterateToBuildOptionList ${contracts.length} items`)
    return contracts.reduce((p, stock) => {
      return p.then(() => {
        let promise: Promise<any>;
        if (stock['options_age'] > (OPTIONS_LIST_BUILD_FREQ / 1440 / 2)) {
          console.log(`iterateToBuildOptionList ${stock.symbol} ${stock['options_age']}`)
          promise = this.requestSecDefOptParams(stock)
            .then((params) => this.iterateSecDefOptParams(stock, params))
            .catch((err: IBApiNextError) => {
              // silently ignore any error
              console.log(`iterateToBuildOptionList error '${err.error.message}'`);
              return Promise.resolve();
            })
        } else {
          promise = Promise.resolve();
        }
        return promise;
      })
    }, Promise.resolve()); // initial
  }

  private findStocksToListOptions(): Promise<Contract[]> {
    return sequelize.query(`
      SELECT
        (julianday('now') - MAX(julianday(option.createdAt))) options_age,
        contract.symbol, contract.con_id conId, contract.id id, contract.currency currency
      FROM option, contract, trading_parameters
      WHERE contract.id = option.stock_id
        AND trading_parameters.stock_id = option.stock_id
      GROUP BY option.stock_id
      `,
    {
      model: Contract,
      raw: true,
      logging: console.log,
      type: QueryTypes.SELECT,
    });
  }

  private async buildOptionsList(): Promise<void> {
    console.log('buildOptionsList');
    await this.findStocksToListOptions().then((stocks) => this.iterateToBuildOptionList(stocks));
    console.log('buildOptionsList done');
    setTimeout(() => this.emit('buildOptionsList'), OPTIONS_LIST_BUILD_FREQ * 60000 / 2);
  };

  private testDB1(): void {
    Option.findAll({ limit: 2 }).then((options) => {
      options.forEach(async (option) => {
        const promA = option.$get('contract');
        const promB = new Promise((resolv, _reject) => {
          option.$get('stock').then((stock) => {
            stock.$get('contract').then((contract) => {
              resolv({stock, contract});
            });
          });
        });
        const res = await Promise.all([promA, promB]);
        const resA: Contract = res[0];
        const resB: {stock: Stock, contract: Contract} = res[1] as any;
        console.log('option:', JSON.stringify(option, null, 2));
        console.log('contract:', JSON.stringify(resA, null, 2));
        console.log('stock:', JSON.stringify(resB['stock'], null, 2));
        console.log('contract:', JSON.stringify(resB.contract, null, 2));
      });
    });
  }

};