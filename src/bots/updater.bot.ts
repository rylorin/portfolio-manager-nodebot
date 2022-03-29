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
  TickType,
} from "@stoqey/ib";
import { TickType as IBApiTickType } from "@stoqey/ib/dist/api/market/tickType";
import { SecurityDefinitionOptionParameterType, IBApiNextTickType } from "@stoqey/ib/dist/api-next";
import { MutableMarketData } from "@stoqey/ib/dist/core/api-next/api/market/mutable-market-data";
import { IBApiNextApp } from "@stoqey/ib/dist/tools/common/ib-api-next-app";
import { sequelize, Contract, Stock, Option } from "../models";
import { ITradingBot } from '.';

require('dotenv').config();

const UPDATE_CONID_FREQ: number = parseInt(process.env.UPDATE_CONID_FREQ) || 10;
const HISTORICAL_DATA_REFRESH_FREQ: number = parseInt(process.env.HISTORICAL_DATA_REFRESH_FREQ) || (12 * 60);
const STOCKS_PRICES_REFRESH_FREQ: number = parseInt(process.env.STOCKS_PRICES_REFRESH_FREQ) || 20;  // mins
const OPTIONS_LIST_BUILD_FREQ: number = parseInt(process.env.OPTIONS_LIST_BUILD_FREQ) || (24 * 60);
const BATCH_SIZE_OPTIONS_PRICE: number = parseInt(process.env.BATCH_SIZE_OPTIONS_PRICE) || 95;
const OPTIONS_PRICE_DTE_FREQ: number = parseInt(process.env.OPTIONS_PRICE_DTE_FREQ) || 15;      // mins
const OPTIONS_PRICE_WEEK_FREQ: number = parseInt(process.env.OPTIONS_PRICE_WEEK_FREQ) || 45;    // mins
const OPTIONS_PRICE_OTHER_FREQ: number = parseInt(process.env.OPTIONS_PRICE_OTHER_FREQ) || 90;  // mins
const OPTIONS_PRICE_TIMEFRAME: number = parseInt(process.env.OPTIONS_PRICE_TIMEFRAME) || 90;    // days

export class UpdaterBot extends EventEmitter implements ITradingBot {

  protected app: IBApiNextApp;
  protected api: IBApiNext;

  constructor(app: IBApiNextApp, api: IBApiNext) {
    super();
    this.app = app;
    this.api = api;
  };

  public start(): void {
    this.on('updateStocksConId', this.updateStocksConId);
    this.on('updateOptionsConId', this.updateOptionsConId);
    this.on('updateHistoricalData', this.updateHistoricalData);
    this.on('updateStocksPrices', this.updateStocksPrices);
    this.on('updateOptionsPrice', this.updateOptionsPrice);
    this.on('buildOptionsList', this.buildOptionsList);

    setTimeout(() => this.emit('updateStocksConId'), 1000);
    setTimeout(() => this.emit('updateOptionsConId'), 2000);
    setTimeout(() => this.emit('updateHistoricalData'), 3000);
    setTimeout(() => this.emit('updateStocksPrices'), 4000);
    setTimeout(() => this.emit('updateOptionsPrice'), 5000);
    setTimeout(() => this.emit('buildOptionsList'), 600000);
  };

  public stop(): void {};

  private updateContractDetails(id: number, detailstab: ContractDetails[]): Promise<[affectedCount: number]> {
    console.log(`updateContractDetails got data for contract id ${id}`)
    if (detailstab.length > 1) {
      // this.app.printObject(detailstab);
      // console.log(`Ambigous results from getContractDetails! ${detailstab.length} results for ${detailstab[0].contract.symbol}`)
    }
    const details: ContractDetails = detailstab[0];
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
        // logging: console.log,
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
      console.log('updateStocksConId done');
      setTimeout(() => this.emit('updateStocksConId'), UPDATE_CONID_FREQ * 60000);
      return Promise.resolve();
  };

  private updateOptionDetails(id: number, detailstab: ContractDetails[], right: OptionType): Promise<[affectedCount: number]> {
    console.log(`-- updateOptionDetails got data for contract id ${id}`)
    if (detailstab.length > 1) {
      // this.app.printObject(detailstab);
      // console.log(`Ambigous results from getContractDetails! ${detailstab.length} results for ${detailstab[0].contract.symbol}`)
    }
    const details: ContractDetails = detailstab[0];
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
          // logging: console.log,
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
      const histVol: number = bars[bars.length-1].close;
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
        // logging: console.log,
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
  
  private requestContractPrice(contract: Contract): Promise<MutableMarketData> {
    // console.log(`requestContractPrice for ${contract.secType} contract ${contract.symbol} ${contract.exchange} id ${contract.id}`);
    if (contract.currency == 'USD') contract.exchange = 'SMART';  // nothing except SMART seems to work
    return this.api
      .getMarketDataSingle(contract, '', false)
      .catch((err: IBApiNextError) => {
          console.log(`getMarketDataSingle failed for contract ${contract.secType} ${contract.symbol} with ${err.code}: '${err.error.message}'`);
          // this.app.printObject(contract);
          throw err;
      });
  }

  private updateContratPrice(contract: Contract, marketData: MutableMarketData): Promise<[affectedCount: number]> {
    console.log(`updateContratPrice got data for ${contract.secType} contract ${contract.symbol} id ${contract.id}`);
    // this.app.printObject(marketData);
    let dataset = {
      price: null,
      updated: new Date(),
    } as any;
    let optdataset = {} as any;
    marketData.forEach((tick, type: TickType) => {
      if (type == IBApiTickType.BID) {
        dataset.bid = tick.value > 0 ? tick.value : null;
        dataset.bidDate = new Date(tick.ingressTm);
      } else if (type == IBApiTickType.ASK) {
        dataset.ask = tick.value > 0 ? tick.value : null;
        dataset.askDate = new Date(tick.ingressTm);
      } else if (type == IBApiTickType.LAST) {
        dataset.price = tick.value > 0 ? tick.value : null;
        dataset.updated = new Date(tick.ingressTm);
      } else if (type == IBApiTickType.CLOSE) {
        dataset.previousClosePrice = tick.value > 0 ? tick.value : null;
      } else if ([ IBApiTickType.BID_SIZE, IBApiTickType.ASK_SIZE, IBApiTickType.LAST_SIZE, IBApiTickType.OPEN,
        IBApiTickType.HIGH, IBApiTickType.LOW, IBApiTickType.VOLUME, IBApiTickType.HALTED ].includes(type as IBApiTickType)) {
        // siliently ignore
        // console.log('silently ignored', type, tick);
      } else if (type == IBApiNextTickType.OPTION_PV_DIVIDEND) {
        optdataset.pv_dividend = tick.value;
      } else if (type == IBApiNextTickType.LAST_OPTION_PRICE) {
        if (!dataset.price) {
          dataset.price = tick.value > 0 ? tick.value : null;
          dataset.updated = new Date(tick.ingressTm);
        // } else {
        //   console.log('updateContratPrice LAST_OPTION_PRICE ignored', dataset.price, tick.value);
        }
      } else if (type == IBApiNextTickType.LAST_OPTION_DELTA) {
        if (tick.value) {
          optdataset.delta = tick.value;
        }
        // console.log('delta (last):', optdataset.delta, tick.value);
      } else if (type == IBApiNextTickType.LAST_OPTION_GAMMA) {
        if (tick.value) {
          optdataset.gamma = tick.value;
        }
      } else if (type == IBApiNextTickType.LAST_OPTION_VEGA) {
        if (tick.value) {
          optdataset.vega = tick.value;
        }
      } else if (type == IBApiNextTickType.LAST_OPTION_THETA) {
        if (tick.value) {
          optdataset.theta = tick.value;
        }
      } else if (type == IBApiNextTickType.LAST_OPTION_IV) {
        if (tick.value) {
          optdataset.implied_volatility = tick.value;
        }
      } else if (type == IBApiNextTickType.MODEL_OPTION_PRICE) {
        if (!dataset.price) {
          dataset.price = tick.value > 0 ? tick.value : null;
          dataset.updated = new Date(tick.ingressTm);
        // } else {
        //   console.log('updateContratPrice MODEL_OPTION_PRICE ignored', dataset.price, tick.value);
        }
      } else if (type == IBApiNextTickType.MODEL_OPTION_IV) {
        if (!optdataset.implied_volatility) {
          optdataset.implied_volatility = tick.value > 0 ? tick.value : null;
        }
      } else if (type == IBApiNextTickType.MODEL_OPTION_DELTA) {
        if (!optdataset.delta) {
          optdataset.delta = tick.value ? tick.value : null;
        }
        // console.log('delta (model):', optdataset.delta, tick.value);
      } else if (type == IBApiNextTickType.MODEL_OPTION_GAMMA) {
        if (!optdataset.gamma) {
          optdataset.gamma = tick.value ? tick.value : null;
        }
      } else if (type == IBApiNextTickType.MODEL_OPTION_VEGA) {
        if (!optdataset.vega) {
          optdataset.vega = tick.value ? tick.value : null;
        }
      } else if (type == IBApiNextTickType.MODEL_OPTION_THETA) {
        if (!optdataset.theta) {
          optdataset.theta = tick.value ? tick.value : null;
        }
      } else if ([ IBApiNextTickType.OPTION_UNDERLYING,
// would be interesting to use OPTION_UNDERLYING to update underlying
        IBApiNextTickType.BID_OPTION_IV, IBApiNextTickType.BID_OPTION_PRICE, IBApiNextTickType.BID_OPTION_DELTA, IBApiNextTickType.BID_OPTION_GAMMA, IBApiNextTickType.BID_OPTION_VEGA, IBApiNextTickType.BID_OPTION_THETA,
        IBApiNextTickType.DELAYED_BID_OPTION_IV, IBApiNextTickType.DELAYED_BID_OPTION_PRICE, IBApiNextTickType.DELAYED_BID_OPTION_DELTA, IBApiNextTickType.DELAYED_BID_OPTION_GAMMA, IBApiNextTickType.DELAYED_BID_OPTION_VEGA, IBApiNextTickType.DELAYED_BID_OPTION_THETA,
        IBApiNextTickType.ASK_OPTION_IV, IBApiNextTickType.ASK_OPTION_PRICE, IBApiNextTickType.ASK_OPTION_DELTA, IBApiNextTickType.ASK_OPTION_GAMMA, IBApiNextTickType.ASK_OPTION_VEGA, IBApiNextTickType.ASK_OPTION_THETA,
        IBApiNextTickType.DELAYED_ASK_OPTION_IV,IBApiNextTickType.DELAYED_ASK_OPTION_PRICE, IBApiNextTickType.DELAYED_ASK_OPTION_DELTA, IBApiNextTickType.DELAYED_ASK_OPTION_GAMMA, IBApiNextTickType.DELAYED_ASK_OPTION_VEGA, IBApiNextTickType.DELAYED_ASK_OPTION_THETA,
        IBApiNextTickType.DELAYED_LAST_OPTION_IV,IBApiNextTickType.DELAYED_LAST_OPTION_PRICE, IBApiNextTickType.DELAYED_LAST_OPTION_DELTA, IBApiNextTickType.DELAYED_LAST_OPTION_GAMMA, IBApiNextTickType.DELAYED_LAST_OPTION_VEGA, IBApiNextTickType.DELAYED_LAST_OPTION_THETA,
        ].includes(type as IBApiNextTickType)) {
        // siliently ignore
        // console.log('silently ignored', type, tick);
      } else {
        console.log('ignored', type, tick);
      }
    });
    return Contract.update(
        dataset,
        {
          where: {
            id: contract.id,
          }
        }
      ).then((affectedCount) => {
        if (contract.secType == 'OPT') {
          // this.app.printObject(dataset);
          // this.app.printObject(optdataset);
          return Option.update(
            optdataset,
            {
              where: {
                id: contract.id,
              }
            }
          );
        } else {
          return affectedCount;
        }
      });
  }

  private iterateContractssForPriceUpdate(contracts: Contract[]): Promise<any> {
    return contracts.reduce((p, contract) => {
      return p.then(() => this.requestContractPrice(contract)
        // .then((marketData) => { console.log(marketData); return marketData; })
        .then((marketData) => this.updateContratPrice(contract, marketData))
        .catch((err) => {
          // silently ignore any error
          return Promise.resolve();
        })
      );
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
        replacements: [STOCKS_PRICES_REFRESH_FREQ / 1440],
        // logging: console.log,
      });
  }

  private findPortfolioContractsNeedingPriceUpdate(): Promise<Contract[]> {
    return sequelize.query(`
      SELECT
          DISTINCT(contract.symbol),
          (julianday('now') - julianday(updated)) age,
          contract.*
        FROM contract, position
        WHERE position.contract_id = contract.id
          AND age > ?
        GROUP BY contract.symbol
        ORDER BY contract.updated
        `,
      {
        model: Contract,
        mapToModel: true, // pass true here if you have any mapped fields
        replacements: [STOCKS_PRICES_REFRESH_FREQ / 1440],
        // logging: console.log,
      });
  }

  private findPortfolioStocksNeedingPriceUpdate(): Promise<Contract[]> {
    return sequelize.query(`
      SELECT
        DISTINCT(stock.symbol),
        (julianday('now') - julianday(stock.updated)) age,
        stock.*
      FROM position, option, contract, contract stock
      WHERE position.contract_id = option.id
        AND option.id = contract.id
        AND option.stock_id = stock.id
        AND age > ?
      GROUP BY stock.symbol
      ORDER BY contract.updated
      `,
      {
        model: Contract,
        mapToModel: true, // pass true here if you have any mapped fields
        replacements: [STOCKS_PRICES_REFRESH_FREQ / 1440],
        // logging: console.log,
      });
  }

  private async updateStocksPrices(): Promise<void> {
    console.log('updateStocksPrices');
    await this.findPortfolioStocksNeedingPriceUpdate()
      .then((contracts) => this.iterateContractssForPriceUpdate(contracts));
    await this.findPortfolioContractsNeedingPriceUpdate()
      .then((contracts) => this.iterateContractssForPriceUpdate(contracts));
    await this.findStocksNeedingPriceUpdate()
      .then((contracts) => this.iterateContractssForPriceUpdate(contracts));
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
        // symbol: `${details.contract.symbol} ${details.realExpirationDate} ${details.contract.strike} ${details.contract.right}`,
        symbol: details.contract.localSymbol,
        currency: details.contract.currency,
        exchange: details.contract.exchange,
        name: details.longName,
      }).then((contract) => {
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
      const now = Date.now();
      const expdate = new Date(
        parseInt(expstr.substring(0, 4)),
        parseInt(expstr.substring(4, 6)) - 1,
        parseInt(expstr.substring(6, 8)),
        22, 30  // 22h30 local time
      );
      const days = (expdate.getTime() - now) / 60000 / 1440;
      // console.log(now, expdate, days, 'days');
      if (days < OPTIONS_PRICE_TIMEFRAME) {
        for (const strike of strikes) {
          // console.log('iterateSecDefOptParamsForExpStrikes', stock.symbol, expstr, strike);
          let put = this.buildOneOptionContract(stock, expstr, strike, OptionType.Put)
            .catch((err) => { /* silently ignore any error */ });
          let call = this.buildOneOptionContract(stock, expstr, strike, OptionType.Call)
            .catch((err) => { /* silently ignore any error */ });
          await Promise.all([put, call]);
        }
      }
    }
    return Promise.resolve();
  }

  private iterateSecDefOptParams(stock: Contract, details: SecurityDefinitionOptionParameterType[]): Promise<void> {
    console.log(`iterateSecDefOptParams: ${stock.symbol} ${details.length}`)
    // use details associated to SMART exchange or first one if SMART not present
    let idx: number = 0;
    for (let i = 0; i < details.length; i++) {
      if (details[i].exchange == 'SMART') {
        idx = i;
        break;
      };
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
        if (stock['options_age'] > (OPTIONS_LIST_BUILD_FREQ / 1440)) {
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
      // logging: console.log,
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

  private findOptionsToUpdatePrice(dte: number, age: number): Promise<Contract[]> {
    return sequelize.query(`
      SELECT
        (julianday('now') - julianday(ifnull(contract.updated, '2022-01-01'))) options_age,
        (julianday(option.last_trade_date) + 1 - julianday('now')) options_dte,
        contract.id, contract.con_id, contract.secType, contract.currency, contract.exchange, stock.symbol, strftime('%Y%m%d', option.last_trade_date) lastTradeDateOrContractMonth, option.strike, option.call_or_put 'right'
      FROM contract, option, trading_parameters, contract stock
      WHERE contract.secType = 'OPT'
        AND contract.id = option.id
        AND stock.id = option.stock_id
        AND trading_parameters.stock_id = option.stock_id
        AND option.expiration >= strftime('%Y%m%d', 'now') 
        AND options_dte < ?
        AND options_age > ?
      ORDER BY options_age DESC
      LIMIT ?
      `,
    {
      // model: Contract,
      raw: true,
      // logging: console.log,
      type: QueryTypes.SELECT,
      replacements: [dte, age / 1400, BATCH_SIZE_OPTIONS_PRICE, ],
    });
  }

  private fetchOptionContractsPrices(contracts: Contract[]): Promise<any[]> {
    let promises: Promise<any>[] = [];
    let count = 0;
    for (const contract of contracts) {
      count++;
      promises.push(
        this.requestContractPrice(contract)
        // .then((marketData) => { console.log(contract.id, marketData); return marketData; })
        .then((marketData) => this.updateContratPrice(contract, marketData))
        .catch((err) => {
          // silently ignore any error
          if (err.code == 10091) {  // 'Part of requested market data requires additional subscription for API. See link in 'Market Data Connections' dialog for more details.Delayed market data is not available.SPY ARCA/TOP/ALL'
            console.log(`requestContractPrice failed for ${contract.symbol} with ${err.code}: '${err.error.message}'`);
          } else
            console.log('fetchOptionContractsPrices error ignored', err);
          return Promise.resolve();
        })
        .finally((): void => {
          if (--count == 0) console.log('fetchOptionContractsPrices all done');
        })
      );
    }
    return Promise.all(promises);
  }

  private async updateOptionsPrice(): Promise<void> {
    console.log('updateOptionsPrice', new Date());
    let contracts: Contract[];
    contracts = await this.findOptionsToUpdatePrice(1, OPTIONS_PRICE_DTE_FREQ);
    if (contracts.length > 0) {
      console.log(contracts.length, 'zero day items');
    } else {
      contracts = await this.findOptionsToUpdatePrice(7, OPTIONS_PRICE_WEEK_FREQ);
      if (contracts.length > 0) {
        console.log(contracts.length, 'one week items');
      } else {
        contracts = await this.findOptionsToUpdatePrice(31, OPTIONS_PRICE_OTHER_FREQ);
        if (contracts.length > 0) {
          console.log(contracts.length, 'one month items');
        } else {
          contracts = await this.findOptionsToUpdatePrice(OPTIONS_PRICE_TIMEFRAME, 999);
          console.log(contracts.length, 'other items');
        }
      }
    }
    await this.fetchOptionContractsPrices(contracts);
    console.log('updateOptionsPrice done', new Date());
    setTimeout(() => this.emit('updateOptionsPrice'), 1 * 1000);
  };
  
};