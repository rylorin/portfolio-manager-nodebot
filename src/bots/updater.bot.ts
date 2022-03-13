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
    this.on('updateStocksConId', this.updateStocksConId);
    this.on('updateOptionsConId', this.updateOptionsConId);
    this.on('updateHistoricalData', this.updateHistoricalData);
    this.on('updateStocksPrices', this.updateStocksPrices);
    this.on('buildOptionsList', this.buildOptionsList);

    // setTimeout(() => this.emit('updateStocksConId'), 1000);
    // setTimeout(() => this.emit('updateOptionsConId'), 2000);
    // setTimeout(() => this.emit('updateHistoricalData'), 3000);
    // setTimeout(() => this.emit('updateStocksPrices'), 4000);
    setTimeout(() => this.emit('buildOptionsList'), 5000);
  };

  public stop(): void {};

  private updateContractDetails(id: number, detailstab: ContractDetails[]): Promise<[affectedCount: number]> {
    console.log(`updateContractDetails got data for contract id ${id}`)
    if (detailstab.length > 1) {
      // this.app.printObject(detailstab);
      // console.log(`Ambigous results from getContractDetails! ${detailstab.length} results for ${detailstab[0].contract.symbol}`)
    }
    let details: ContractDetails = detailstab[0];
    this.app.printObject(details);
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
        // console.log(`-- getContractDetails failed for ${contract.symbol} with '${err.error.message}'`);
        throw err;
      });
  }

  private async requestContractDetailsX(contract: IbContract): Promise<ContractDetails[]> {
    // console.log(`requestContractDetails for contract ${contract.symbol}`){}
    try {
      return await this.api.getContractDetails(contract)
    } catch (err) {
      console.log(`-- getContractDetails failed for ${contract.symbol} with '${err.error.message}'`);
      throw err;
    }
  }

  private iterateContractsForDetails(contracts: Contract[]): Promise<any> {
    return contracts.reduce((p, contract) => {
      return p.then(() => this.requestContractDetails(contract)
        .then((detailstab) => this.updateContractDetails(contract.id, detailstab))
        .catch((err) => {
          // silently ignore any error
          if (err instanceof Error) {}
        }));
    }, Promise.resolve()); // initial
  }

  private findStocksWithoutConId(): Promise<Contract[]> {
    return sequelize.query(`
      SELECT
        contract.*
      FROM contract
      WHERE contract.secType = 'STK'
        AND contract.con_id ISNULL
      `,
      {
        model: Contract,
        mapToModel: true, // pass true here if you have any mapped fields
        logging: console.log,
      }
    );
  }

  private async toto(): Promise<any> {
    console.log('toto debut')
    const result = this.findStocksWithoutConId()
    console.log('toto fin')
    return result
  }

  private async tata(): Promise<void> {
    console.log('tata debug')
    const tt = this.toto()
    console.log('tata end')
    //await tt.then(result => console.log(result))
    const result = await tt
    console.log('fin')
  }

  private async updateStocksConId(): Promise<void> {
      console.log('updateStocksConId begin');
      const contracts = await this.findStocksWithoutConId()
      await this.iterateContractsForDetails(contracts)
        // .then((contracts) => this.iterateContractsForDetails(contracts));
      console.log('updateStocksConId done');
      setTimeout(() => this.emit('updateStocksConId'), UPDATE_CONID_FREQ * 60000);
      //return Promise.resolve();
  };

  private updateOptionDetails(id: number, detailstab: ContractDetails[], right: OptionType): Promise<[affectedCount: number]> {
    console.log(`-- updateOptionDetails got data for contract id ${id}`)
    if (detailstab.length > 1) {
      // this.app.printObject(detailstab);
      // console.log(`Ambigous results from getContractDetails! ${detailstab.length} results for ${detailstab[0].contract.symbol}`)
    }
    let details: ContractDetails = detailstab[0];
    // this.app.printObject(details);
    // let exchange: string = undefined;
    // details.validExchanges.split(',').forEach((exch) => {
    //   if (exchange == undefined) exchange = exch;
    //   if (exchange == 'SMART') exchange = exch;
    // })
    return Contract.update(
      {
        conId: details.contract.conId,
        symbol: `${details.contract.symbol} ${details.contract.lastTradeDateOrContractMonth} ${details.contract.strike} ${details.contract.right}`,
        secType: details.contract.secType,
        exchange: details.contract.exchange,
        currency: details.contract.currency,
        name: details.longName,
      } as Contract, {
      where: {
        id: id,
      }
    });
  }

  private iterateOptionsForDetails(contracts: Contract[]): Promise<any> {
    // this.app.printObject(contracts);
    return contracts.reduce((p, contract) => {
      return p.then(() => this.requestContractDetails({
          symbol: contract['stock_symbol'],
          secType: contract.secType as SecType,
          currency: contract.currency,
          lastTradeDateOrContractMonth: contract['expstr'],  // while expiration column is not filled for all
          strike: contract['strike'],
          right: contract['call_or_put'] as OptionType,
          exchange: contract.exchange,
        })
        .then((detailstab) => this.updateOptionDetails(contract.id, detailstab, contract['call_or_put']))
        .catch((err) => {
          // silently ignore any error
          console.log(
            `-- iterateOptionsForDetails error for contract id ${contract.id};
  DELETE FROM option WHERE id = ${contract.id};
  DELETE FROM contract WHERE id = ${contract.id};
            `);
          // this.app.printObject(err);
          return Promise.resolve();
        }));
    }, Promise.resolve()); // initial
  }

  private findOptionsWithoutConId(): Promise<Contract[]> {
      return sequelize.query(`
        SELECT strftime('%Y%m%d', option.last_trade_date) expstr,
          contract.*, option.*, stock.symbol stock_symbol, stock.exchange stock_exchange
        FROM contract, option, contract stock
        WHERE contract.secType = 'OPT'
          AND contract.con_id ISNULL
          AND option.id = contract.id
          AND stock.id = option.stock_id
        ORDER BY option.createdAt DESC
        `,
        {
          model: Contract,
          raw: true,
          logging: console.log,
        }
      );
  }

  private async updateOptionsConId(): Promise<void> {
      console.log('updateOptionsConId begin');
      await this
        .findOptionsWithoutConId()
        .then((contracts) => this.iterateOptionsForDetails(contracts));
      console.log('updateOptionsConId done');
      setTimeout(() => this.emit('updateOptionsConId'), UPDATE_CONID_FREQ * 60000);
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
  
  private createOptionContractFromDetails(stock: Contract, expstr: string, strike: number, right: OptionType, detailstab: ContractDetails[]): Promise<Option> {
    const details: ContractDetails = detailstab[0];
    console.log('createOptionContractFromDetails', details.contract.symbol, details.realExpirationDate, details.contract.strike, details.contract.right);
    return Contract.create({
        conId: details.contract.conId,
        secType: details.contract.secType,
        // could use localSymbol as well
        symbol: `${details.contract.symbol} ${details.realExpirationDate} ${details.contract.strike} ${details.contract.right}`,
        currency: details.contract.currency,
        exchange: details.contract.exchange,
        name: details.longName,
      }).then((contract) => {
        // this.app.printObject(details);
        // this.app.printObject(contract);
        // caveat: need to offset according to timezone details.timeZoneId
        let lastTradeDate: Date;
        if (details.contract.lastTradeDateOrContractMonth.length > 8) {
          lastTradeDate = new Date(
            parseInt(details.contract.lastTradeDateOrContractMonth.substring(0, 4)),
            parseInt(details.contract.lastTradeDateOrContractMonth.substring(4, 6)) - 1,
            parseInt(details.contract.lastTradeDateOrContractMonth.substring(6, 8)),
            parseInt(details.contract.lastTradeDateOrContractMonth.substring(9, 11)),
            parseInt(details.contract.lastTradeDateOrContractMonth.substring(12, 14)),
          );
        } else {
          lastTradeDate = new Date(
            parseInt(details.contract.lastTradeDateOrContractMonth.substring(0, 4)),
            parseInt(details.contract.lastTradeDateOrContractMonth.substring(4, 6)) - 1,
            parseInt(details.contract.lastTradeDateOrContractMonth.substring(6, 8)),
            16,
            30
          );
        }
        // console.log('lastTradeDate', lastTradeDate);
        return Option.create({
          id: contract.id,
          stock_id: stock.id,
          lastTradeDate: lastTradeDate,
          expiration: details.realExpirationDate,
          strike: details.contract.strike,
          callOrPut: details.contract.right,
        })
      })
  }

  private async buildOneOptionContract(stock: Contract, expstr: string, strike: number, right: OptionType): Promise<Option> {
    const option = await Option.findOne({
      where: {
        stock_id: stock.id,
        expiration: parseInt(expstr),
        strike: strike,
        call_or_put: right,
      }
    });
    if (option === null) {
      return this.requestContractDetails({
        symbol: stock.symbol,
        currency: stock.currency,
        secType: 'OPT' as SecType,
        lastTradeDateOrContractMonth: expstr,
        strike: strike,
        right: right,
      })
      .catch((err: IBApiNextError) => {
          console.log(`buildOneOptionContract ${stock.symbol} ${expstr} ${strike} ${right} failed with '${err.error.message}'`);
          throw err;
      })
      .then((detailstab) => this.createOptionContractFromDetails(stock, expstr, strike, right, detailstab));
    } else {
      // console.log(`contract ${stock.symbol} ${expstr} ${strike} ${right} already exists`);
      return option;
    }
  }

  private async iterateSecDefOptParamsForExpStrikes(stock: Contract, expirations: string[], strikes: number[]): Promise<void> {
    // this.app.printObject(stock);
    for (const expstr of expirations) {
      for (const strike of strikes) {
        // console.log('iterateSecDefOptParamsForExpStrikes', stock.symbol, expstr, strike);
        let put = this.buildOneOptionContract(stock, expstr, strike, OptionType.Put)
          .catch((err) => { /* silently ignore any error */ });
        let call = this.buildOneOptionContract(stock, expstr, strike, OptionType.Call)
          .catch((err) => { /* silently ignore any error */ });
        await Promise.all([put, call]);
      } 
    }
    return Promise.resolve();
  }

  private async iterateSecDefOptParamsX(stock: Contract, details: SecurityDefinitionOptionParameterType[]): Promise<void> {
    console.log(`iterateSecDefOptParams: ${stock.symbol} ${details.length} items ${details[0].exchange}`)
    // it seems that SMART is always first item, therefore this could be reduced to parent's calling iterateSecDefOptParamsForExpStrikes with first item of details array
    for (const detail of details) {
      if (detail.exchange == 'SMART') {
        await this.iterateSecDefOptParamsForExpStrikes(stock, detail.expirations, detail.strikes)
      } 
    }
  }

  private iterateSecDefOptParams(stock: Contract, details: SecurityDefinitionOptionParameterType[]): Promise<void> {
    console.log(`iterateSecDefOptParams: ${stock.symbol} ${details.length}`)
    // use details associated to SMART exchange or first one if SMART not present
    let idx: number;
    for (idx = 0; idx < details.length; idx++) {
      if (details[idx].exchange == 'SMART') break;
    }
    return this.iterateSecDefOptParamsForExpStrikes(stock, details[idx].expirations, details[idx].strikes);
  }

  private requestSecDefOptParams(stock: Contract): Promise<SecurityDefinitionOptionParameterType[]> {
    // console.log(`requestSecDefOptParams: ${stock.symbol}`);
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
        if (stock['options_age'] > (OPTIONS_LIST_BUILD_FREQ / 1440 / 2)) {
          console.log(`iterateToBuildOptionList ${stock.symbol} ${stock['options_age']}`)
          return this.requestSecDefOptParams(stock)
            .then((params) => this.iterateSecDefOptParams(stock, params));
        }
        return Promise.resolve();
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