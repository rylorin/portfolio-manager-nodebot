import { EventEmitter } from 'events';
import { Subscription } from "rxjs";
import { IBApiNext, IBApiNextError, BarSizeSetting, IBApiTickType, IBApiNextTickType, SecType, ContractDetails } from "@stoqey/ib";
import { SecurityDefinitionOptionParameterType } from "@stoqey/ib/dist/api-next";
import { IBApiNextApp } from "@stoqey/ib/dist/tools/common/ib-api-next-app";
import { QueryTypes } from 'sequelize';
import { sequelize, Contract, Stock, Option } from "../models";
import { ITradingBot } from '.';
require('dotenv').config();

const MAX_PARALLELS_UPDATES: number = parseInt(process.env.MAX_PARALLELS_UPDATES) || 1;
const STOCKS_PRICES_REFRESH_FREQ: number = parseInt(process.env.STOCKS_PRICES_REFRESH_FREQ) || 20;
const OPTIONS_LIST_BUILD_FREQ: number = parseInt(process.env.OPTIONS_LIST_BUILD_FREQ) || (60 * 12);
const UPDATE_CONID_FREQ: number = parseInt(process.env.UPDATE_CONID_FREQ) || 10;

export class UpdaterBot extends EventEmitter implements ITradingBot {

  protected app: IBApiNextApp;
  protected api: IBApiNext;

  constructor(app: IBApiNextApp, api: IBApiNext) {
    super();
    this.app = app;
    this.api = api;
  }

  public start(): void {
    this.api
    .getNextValidOrderId()
    .then((id) => {
      this.app.printText(`getNextValidOrderId: ${id}`);
    })
    .catch((err: IBApiNextError) => {
      this.app.error(`getNextValidOrderId failed with '${err.error.message}'`);
    });

    this.on('updateContractDetails', this.updateContractDetails);
    this.on('updateStocksPrices', this.updateStocksPrices);
    // this.on('run', this.run);
    // for (let i = 0; i < MAX_PARALLELS_UPDATES; i++) {
    //   setTimeout(() => this.emit('run'), 1000 * i);
    // }
    setTimeout(() => this.emit('updateContractDetails'), 1000);
    setTimeout(() => this.emit('updateStocksPrices'), 2000);
  };

  public stop(): void {};

  protected concurrentRuns = 0;

  public run(): void {
    console.log('concurrentRuns:', ++this.concurrentRuns, 'out of', MAX_PARALLELS_UPDATES)
    this.processNextUpdate();
  };

  protected pushRun(): void {
    setTimeout(() => this.emit('run'), 1000);
  }

  protected runDone(): void {
    console.log('concurrentRuns:', --this.concurrentRuns)
    this.pushRun();
  }

  private updateContractDetails(): void {
    console.log('updateContractDetails');

    sequelize.query(`
      SELECT
          contract.*
        FROM contract
        WHERE contract.con_id ISNULL
        `,
      {
        model: Contract,
        mapToModel: true, // pass true here if you have any mapped fields
        replacements: [STOCKS_PRICES_REFRESH_FREQ/1440/2],
        logging: console.log,
      }).then((contracts) => {
        contracts.forEach(async (contract) => {
          // console.log('contract:', JSON.stringify(contract, null, 2));
          let promises: Array<Promise<any>> = [];

          // get contract details
          console.log(`getContractDetails for ${contract.symbol}`);
          promises.push(this.api
            .getContractDetails({
              symbol: contract.symbol as string,
              secType: contract.secType as SecType,
              // conId: contract.conId,
              exchange: contract.exchange,
              currency: contract.currency,
            })
            .then((detailstab) => {
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
            })
            .catch((err: IBApiNextError) => {
              console.log(`getContractDetails failed for ${contract.symbol} with '${err.error.message}'`);
            }))

          const res = await Promise.all(promises);
        })
      });

      console.log('updateContractDetails done');
      setTimeout(() => this.emit('updateContractDetails'), UPDATE_CONID_FREQ * 60000 / 2);
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
            // console.log('contract:', JSON.stringify(contract, null, 2));
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
                '', true, false)
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
                    // console.log('contract:', contract.symbol);
                    // this.app.printObject(dataWithTickNames);
                  });
              })
              .catch((err: IBApiNextError) => {
                this.app.error(`getMarketDataSingle failed with '${err.error.message}'`);
              })
            );
  
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
                Stock.update({
                    historicalVolatility: bars[bars.length-1].close
                  }, {
                    where: {
                      id: contract.id
                    }
                  }
                );
                // console.log('contract:', contract.symbol, 'historicalVolatility:', bars[0].close);
              })
              .catch((err: IBApiNextError) => {
                this.app.error(`getHistoricalData failed with '${err.error.message}'`);
              })
            );
  
            const res = await Promise.all(promises);
          })
        });
  
        console.log('updateStocksPrices done');
        setTimeout(() => this.emit('updateStocksPrices'), STOCKS_PRICES_REFRESH_FREQ * 60000 / 2);
      };

  private processNextUpdate(): void {
    console.log('processNextUpdate');
    sequelize.query(`
      SELECT
          DISTINCT(contract.symbol), SUM(trading_parameters.nav_ratio) nav_ratio_sum, julianday('now'), julianday('now', 'localtime'), julianday(updated), julianday('now', 'localtime') - julianday(updated), (julianday('now') - MAX(julianday(option.createdAt))) options_age,
          contract.*
        FROM trading_parameters, contract, option
        WHERE trading_parameters.stock_id = contract.id
          AND trading_parameters.stock_id = option.stock_id
        GROUP BY contract.symbol
        ORDER BY contract.updated
        LIMIT 1
        `, // prévoir un outer join sur option pour le cas où il n'y a pas encore d'options en base pour le stock
      {
        model: Contract,
        mapToModel: true, // pass true here if you have any mapped fields
      }).then((contracts) => {
        contracts.forEach(async (contract) => {
          console.log('contract:', JSON.stringify(contract, null, 2));
          await Contract.update(
            {
              price: undefined,
              ask: undefined,
              bid: undefined,
              updated: new Date(),
            } as Contract, {
            where: {
              id: contract.id
            }
          });

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
              '', true, false)
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
                  // console.log('contract:', contract.symbol);
                  // this.app.printObject(dataWithTickNames);
                });
            })
            .catch((err: IBApiNextError) => {
              this.app.error(`getMarketDataSingle failed with '${err.error.message}'`);
            })
          );

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
              Stock.update({
                  historicalVolatility: bars[0].close
                }, {
                  where: {
                    id: contract.id
                  }
                }
              );
              // console.log('contract:', contract.symbol, 'historicalVolatility:', bars[0].close);
            })
            .catch((err: IBApiNextError) => {
              this.app.error(`getHistoricalData failed with '${err.error.message}'`);
            })
          );

          if (contract.conId === undefined) {
            // get contract details
            promises.push(this.api
              .getContractDetails({
                symbol: contract.symbol as string,
                secType: contract.secType as SecType,
                // conId: contract.conId,
                exchange: contract.exchange,
                currency: contract.currency,
              })
              .then((detailstab) => {
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
              })
              .catch((err: IBApiNextError) => {
                this.app.error(`getContractDetails failed with '${err.error.message}'`);
              }));
          } else {
              promises.push(sequelize.query(`
                SELECT
                    (julianday('now') - MAX(julianday(option.createdAt))) options_age
                  FROM option, contract
                  WHERE option.stock_id = ?
                  GROUP BY option.stock_id
                  LIMIT 1
                  `, {
              // A function (or false) for logging your queries
              // Will get called for every SQL query that gets sent
              // to the server.
              // logging: console.log,
              // If plain is true, then sequelize will only return the first
              // record of the result set. In case of false it will return all records.
              plain: false,
              // Set this to true if you don't have a model definition for your query.
              raw: false,
              // The type of query you are executing. The query type affects how results are formatted before they are passed back.
              type: QueryTypes.SELECT,
              // query parameters
              replacements: [contract.id],
            }).then((row) => {
              // get option chain info, if conid available
              if (contract.conId && (row['options_age'] == undefined || row['options_age'] > 1)) {
                // console.log('contract:', JSON.stringify(contract, null, 2));
                promises.push(
                  this.api
                    .getSecDefOptParams(
                      contract.symbol as string,
                      '', // SMART ?
                      contract.secType as SecType,
                      contract.conId
                    )
                    .then((details) => {
                      details.forEach((detail: SecurityDefinitionOptionParameterType) => {
                        if (detail.exchange == 'SMART') {
                          // this.app.printObject(detail);
                          detail.expirations.forEach((expiration) => {
                            detail.strikes.forEach((strike) => {
                              // check or create option
                            })
                          });
                        }
                      });
                    })
                    .catch((err: IBApiNextError) => {
                      this.app.error(`getSecDefOptParams failed with '${err.error.message}'`);
                    })
                );
              }
            })
            );
          }

          const res = await Promise.all(promises);
          this.runDone();
        })
      });
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