import { EventEmitter } from 'events';
import { Subscription } from "rxjs";
import { IBApiNext, IBApiNextError, BarSizeSetting, IBApiTickType, IBApiNextTickType, SecType, ContractDetails, OptionType } from "@stoqey/ib";
import { SecurityDefinitionOptionParameterType } from "@stoqey/ib/dist/api-next";
import { IBApiNextApp } from "@stoqey/ib/dist/tools/common/ib-api-next-app";
import { QueryTypes } from 'sequelize';
import { sequelize, Contract, Stock, Option } from "../models";
import { ITradingBot } from '.';
import exp from 'constants';
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
    // this.api
    // .getNextValidOrderId()
    // .then((id) => {
    //   this.app.printText(`getNextValidOrderId: ${id}`);
    // })
    // .catch((err: IBApiNextError) => {
    //   this.app.error(`getNextValidOrderId failed with '${err.error.message}'`);
    // });

    this.on('updateStocksDetails', this.updateStocksDetails);
    this.on('updateHistoricalData', this.updateHistoricalData);
    this.on('updateStocksPrices', this.updateStocksPrices);
    this.on('buildOptionsList', this.buildOptionsList);

    setTimeout(() => this.emit('updateStocksDetails'), 1000);
    // setTimeout(() => this.emit('updateHistoricalData'), 2000);
    // setTimeout(() => this.emit('updateStocksPrices'), 3000);
    // setTimeout(() => this.emit('buildOptionsList'), 4000);
  };

  public stop(): void {};

  private updateStocksDetails(): void {
    console.log('updateStocksDetails');

    sequelize.query(`
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
      }).then((contracts) => {
        contracts.forEach(async (contract) => {
          // console.log('contract:', JSON.stringify(contract, null, 2));
          let promises: Array<Promise<any>> = [];

          // get contract details
          console.log(`getContractDetails for ${contract.symbol}`);
          // this.app.printObject(contract);
          promises.push(this.api
            .getContractDetails({
              symbol: contract.symbol as string,
              secType: contract.secType as SecType,
              exchange: contract.exchange,
              currency: contract.currency,
            })
            .then((detailstab) => {
              if (detailstab.length == 1) {
                let details: ContractDetails = detailstab[0];
                // this.app.printObject(details);
                Contract.update(
                  {
                    conId: details.contract.conId,
                    symbol: details.contract.symbol,
                    secType: details.contract.secType,
                    exchange: details.contract.exchange,
                    currency: details.contract.currency,
                    name: details.longName,
                  } as Contract, {
                  where: {
                    id: contract.id
                  }
                })
                  .then(() => {
                    console.log('getContractDetails succeeded for contract:', contract.symbol);
                  });
                } else {
                this.app.printObject(detailstab);
                this.app.error(`ambigous results from getContractDetails! ${detailstab.length} results`)
                }
            })
            .catch((err: IBApiNextError) => {
              console.log(`getContractDetails failed for ${contract.symbol} with '${err.error.message}'`);
            }))

          const res = await Promise.all(promises);
        })
      });

    console.log('updateStocksDetails done');
    setTimeout(() => this.emit('updateStocksDetails'), UPDATE_CONID_FREQ * 60000);
  };

  private updateHistoricalData(): void {
    console.log('updateHistoricalData');

    sequelize.query(`
      SELECT
          DISTINCT(contract.symbol), SUM(trading_parameters.nav_ratio) nav_ratio_sum,
          stock.historical_volatility,
          (julianday('now') - julianday(updated)) age,
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
      }).then((contracts) => {
        contracts.forEach(async (contract) => {
          // console.log('contract:', JSON.stringify(contract, null, 2));
          let promises: Array<Promise<any>> = [];
  
          // get historical volatility
          console.log(`getHistoricalData for ${contract.symbol}`);
          promises.push(this.api
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
            )
            .then((bars) => {
              console.log(`getHistoricalData historicalVolatility(${contract.symbol}): ${bars[bars.length-1].close}`);
              Stock.update({
                  historicalVolatility: bars[bars.length-1].close
                }, {
                  where: {
                    id: contract.id
                  }
                }
              );
            })
            .catch((err: IBApiNextError) => {
              this.app.error(`getHistoricalData failed with '${err.error.message}'`);
            })
          );

          const res = await Promise.all(promises);
        })
      });

      console.log('updateHistoricalData done');
      setTimeout(() => this.emit('updateHistoricalData'), HISTORICAL_DATA_REFRESH_FREQ * 60000);
    };

  private updateStocksPrices(): void {
    console.log('updateStocksPrices');

    sequelize.query(`
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
      }).then((contracts) => {
        contracts.forEach(async (contract) => {
          console.log('getMarketDataSingle:', contract.symbol);
          let promises: Array<Promise<any>> = [];
  
          // get price
          promises.push(this.api
            .getMarketDataSingle(
              {
                conId: contract.conId as number ?? undefined,
                symbol: contract.symbol as string,
                secType: contract.secType as SecType,
                exchange: 'SMART',
                currency: contract.currency as string,
              },
              '', false)
            .then((marketData) => {
              const dataWithTickNames = new Map<string, number>();
              marketData.forEach((tick, type) => {
                if (type > IBApiNextTickType.API_NEXT_FIRST_TICK_ID) {
                  dataWithTickNames.set(
                    IBApiNextTickType[type],
                    tick.value
                  );
                } else {
                  dataWithTickNames.set(
                    IBApiTickType[type],
                    tick.value
                  );
                }
              });
              Contract.update(
                {
                  price: marketData['last'],
                  ask: marketData['ask'],
                  bid: marketData['bid'],
                  updated: new Date(),
                } as Contract, {
                where: {
                  id: contract.id
                }
              })
                .then(() => {
                  console.log(`getMarketDataSingle succeeded for ${contract.symbol}`);
                  // this.app.printObject(dataWithTickNames);
                });
            })
            .catch((err: IBApiNextError) => {
              this.app.error(`getMarketDataSingle failed with '${err.error.message}'`);
            })
          );

          const res = await Promise.all(promises);
        })
      });

      console.log('updateStocksPrices done');
      setTimeout(() => this.emit('updateStocksPrices'), STOCKS_PRICES_REFRESH_FREQ * 60000 / 2);
    };

  private buildOptionsList(): void {
    console.log('buildOptionsList');

    sequelize.query(`
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
      }).then((stocks) => {
        stocks.forEach((stock) => {
          // console.log('contract:', JSON.stringify(contract, null, 2));
          if (stock['options_age'] > (OPTIONS_LIST_BUILD_FREQ / 1440 / 2)) {
            console.log('getSecDefOptParams:', stock.symbol);
            this.api
              .getSecDefOptParams(
                stock.symbol,
                '', // exchange but only empty string returns results
                'STK' as SecType,
                stock.conId
              )
              .then((details) => {
                details.forEach((detail: SecurityDefinitionOptionParameterType) => {
                  if (detail.exchange == 'SMART') {
                    // this.app.printObject(detail);
                    detail.expirations.forEach((expiration) => {
                      detail.strikes.forEach((strike) => {
                        // check or create option
                        let expstr: string = expiration;
                        let exp: Date = new Date(
                          parseInt(expstr.substring(0, 4)),
                          parseInt(expstr.substring(4, 6)) - 1,
                          parseInt(expstr.substring(6, 8)),
                        );
                        // console.log(expstr, parseInt(expstr.substring(0, 4)),
                        //   parseInt(expstr.substring(4, 6)) - 1,
                        //   parseInt(expstr.substring(6, 8)), exp);
                        // this.app.error(`buildOptionsList please examine results`);
                        Option.findOne({
                          where: {
                            stock_id: stock.id,
                            lastTradeDate: exp,
                            strike: strike,
                          }
                        }).then((result) => {
                          if (result == null) {
                            console.log(`buildOptionsList: ${stock.symbol} ${expiration} ${strike}`);
                            Contract.create({
                              secType: 'OPT',
                              symbol: `${stock.symbol} ${expstr} ${strike} P`,
                              currency: stock.currency,
                            }).then((contract) => {
                              Option.create({
                                id: contract.id,
                                stock_id: stock.id,
                                lastTradeDate: exp,
                                expiration: expiration,
                                strike: strike,
                                callOrPut: 'P',
                              }).then((option) => {
                                // this.app.printObject(option);
                                this.api.getContractDetails({
                                  symbol: stock.symbol,
                                  secType: 'OPT' as SecType,
                                  // exchange: contract.exchange,
                                  currency: stock.currency,
                                  strike: strike,
                                  right: 'P' as OptionType,
                                })
                                  .then((detailstab) => {
                                    if (detailstab.length > 1) {
                                      this.app.printObject(detailstab);
                                      console.log(`ambigous results from getContractDetails! ${detailstab.length} results`)
                                    }
                                    let details: ContractDetails = detailstab[0];
                                    // this.app.printObject(details);
                                    Contract.update(
                                      {
                                        conId: details.contract.conId,
                                        symbol: details.contract.localSymbol,
                                        secType: details.contract.secType,
                                        exchange: details.contract.exchange,
                                        currency: details.contract.currency,
                                        name: details.longName,
                                      } as Contract, {
                                      where: {
                                        id: contract.id
                                      }
                                    })
                                      .then(() => {
                                        console.log('getContractDetails succeeded for contract:', contract.symbol);
                                        this.app.error(`buildOptionsList please examine results`);
                                      });
                                  })
                              })
                            })
                          }
                        });
                      })
                    });
                  }
                });
              })
              .catch((err: IBApiNextError) => {
                this.app.error(`getSecDefOptParams failed with '${err.error.message}'`);
              })
          }
        })
      });

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