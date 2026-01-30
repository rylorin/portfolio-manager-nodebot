import { IBApiNext, Contract as IbContract, SecType } from "@stoqey/ib";
import { XMLParser } from "fast-xml-parser";
import { DateTime } from "luxon";
import { ITradingBot, awaitTimeout } from ".";
import { MyTradingBotApp } from "..";
import logger, { LogLevel } from "../logger";
import {
  BondContract,
  Contract,
  DividendStatement,
  EquityStatement,
  FeeStatement,
  InterestStatement,
  OptionStatement,
  Portfolio,
  SalesTaxes,
  Statement,
  StatementStatus,
  TaxStatement,
} from "../models";
import { BondStatement, CorporateStatement, StatementTypes } from "../models/";

const MODULE = "ImporterBot";

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unused-vars
const sequelize_logging = (...args: any[]): void => logger.trace(MODULE + ".squelize", ...args);

const ibContractFromElement = (element: any): IbContract => {
  const ibContract = {
    secType: element.assetCategory,
    conId: parseInt(element.conid), // eslint-disable-line @typescript-eslint/no-unsafe-argument
    symbol:
      element.assetCategory == SecType.OPT || element.assetCategory == SecType.FOP
        ? element.underlyingSymbol
        : element.symbol,
    primaryExch: element.listingExchange,
    currency: element.currency,
    strike: parseFloat(element.strike), // eslint-disable-line @typescript-eslint/no-unsafe-argument
    lastTradeDateOrContractMonth: element.expiry?.replaceAll("-", ""), // eslint-disable-line @typescript-eslint/no-unsafe-call
    multiplier: parseInt(element.multiplier), // eslint-disable-line @typescript-eslint/no-unsafe-argument
    right: element.putCall,
    description: element.description,
    localSymbol: element.symbol,
    secIdType: element.securityIDType,
    secId: element.securityIDType == "ISIN" ? element.isin : undefined,
    // the following are not part of the IB contract but will be used as details if the contract details are unknown from the API
    underConId: parseInt(element.underlyingConid), // eslint-disable-line @typescript-eslint/no-unsafe-argument
    underSymbol: element.underlyingSymbol,
  };
  return ibContract;
};

const ibUnderlyingContractFromElement = (element: any): IbContract => {
  let secType: SecType | undefined = undefined;
  if (element.underlyingCategory) secType = element.underlyingCategory;
  else if (element.assetCategory == SecType.FOP) secType = SecType.FUT;
  else if (element.assetCategory == SecType.OPT) secType = SecType.STK;
  else if (element.assetCategory == SecType.FUT) secType = SecType.IND;
  const ibContract: IbContract = {
    secType,
    conId: element.underlyingConid,
    symbol: element.underlyingSymbol,
    primaryExch: element.underlyingListingExchange,
    currency: element.currency,
  };
  return ibContract;
};

const transactionStatusFromElement = (element: any): StatementStatus => {
  if (element.notes == "A") return StatementStatus.ASSIGNED_STATUS;
  else if (element.notes == "Ep") return StatementStatus.EXPIRED_STATUS;
  else if (element.notes == "Ex") return StatementStatus.EXERCISED_STATUS;
  else if (element.notes == "Ca")
    return StatementStatus.CANCELLED_STATUS; // Cancelled
  else if (element.openCloseIndicator == "O") return StatementStatus.OPEN_STATUS;
  else if (element.openCloseIndicator == "C;O") return StatementStatus.OPEN_STATUS;
  else if (element.openCloseIndicator == "C") return StatementStatus.CLOSE_STATUS;
  else if (element.assetCategory == "CASH") return StatementStatus.UNDEFINED_STATUS;
  else if (element.openCloseIndicator === undefined) return StatementStatus.UNDEFINED_STATUS;
  else {
    logger.error(MODULE + ".transactionStatusFromElement", "unknown status: ", element);
    throw Error("undefined status");
  }
};

const getCurrencyFromElement = (currency: string): string => {
  switch (currency) {
    case "USD":
      return "$";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    default:
      return currency.toUpperCase(); // Return the currency code as is for other currencies;
  }
};

const transactionDescriptionFromElement = (element: any): string => {
  let description = "";
  switch (transactionStatusFromElement(element)) {
    case StatementStatus.ASSIGNED_STATUS:
      // console.log(MODULE + ".transactionDescriptionFromElement", element);
      description += "Assigned";
      break;
    case StatementStatus.EXPIRED_STATUS:
      description += "Expired";
      break;
    case StatementStatus.EXERCISED_STATUS:
      description += "Exercized";
      break;
    case StatementStatus.OPEN_STATUS:
      description += "Opened";
      break;
    case StatementStatus.CLOSE_STATUS:
      description += "Closed";
      break;
    case StatementStatus.CANCELLED_STATUS:
      description += "Cancelled";
      break;
    default:
      description += element.notes;
  }
  return (
    description +
    " " +
    (element.assetCategory == "BOND"
      ? Math.round(element.quantity / 1000) + "k" + getCurrencyFromElement(element.currency as string)
      : element.quantity) +
    " " +
    (element.assetCategory == "STK" ? element.symbol : element.description) +
    "@" +
    element.tradePrice +
    (element.assetCategory == "BOND" ? "%" : getCurrencyFromElement(element.currency as string))
  );
};

interface FlexStatement {
  AccountInformation?: any;
  EquitySummaryInBase?: any;
  Trades?: any;
  TransactionTaxes?: any;
  OptionEAE?: any;
  CorporateActions?: any;
  CashTransactions?: any;
  SalesTaxes?: any;
  SecuritiesInfo?: any;
  accountId?: string;
  fromDate?: string;
  toDate?: string;
  period?: string;
  whenGenerated?: string;
}

export class ImporterBot extends ITradingBot {
  private token: string;
  private query: string;

  constructor(app: MyTradingBotApp, api: IBApiNext, account: string) {
    super(app, api, account);
    if (process.env.IB_TOKEN_ID) this.token = process.env.IB_TOKEN_ID;
    if (process.env.IB_QUERY_ID) this.query = process.env.IB_QUERY_ID;
  }

  /*
 processSecurityInfo {
   assetCategory: 'FOP',
   symbol: 'QN2M3 C14780',
   description: 'NQ 09JUN23 14780 C',
   conid: '635286755',
   securityID: '',
   listingExchange: 'CME',
   multiplier: '20',
   subCategory: 'C',
   code: '',
   currency: 'USD',
   issuer: '',
   underlyingCategory: 'FUT',
   underlyingConid: '551601533',
   underlyingSymbol: 'NQM3',
   underlyingListingExchange: 'CME',
   settlementPolicyMethod: 'Delivery',
   strike: '14780',
   expiry: '2023-06-09',
   putCall: 'C',
   securityIDType: '',
   cusip: '',
   isin: '',
   underlyingSecurityID: '',
   fineness: '0.0',
   maturity: '',
   issueDate: '',
   deliveryType: '',
   commodityType: '',
   principalAdjustFactor: '',
   weight: '0.0 ()',
   serialNumber: ''
 }
  */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  protected async processSecurityInfoUnderlying(element: any): Promise<Contract | undefined> {
    if (element.underlyingConid) {
      const ibContract = ibUnderlyingContractFromElement(element);
      return this.findOrCreateContract({ ibContract }).catch((e) => {
        console.error("processSecurityInfoUnderlying failed:", e, "element:", element);
        throw e;
      });
    } else return Promise.resolve(undefined as undefined);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  protected async processSecurityInfo(element: any): Promise<Contract | undefined> {
    logger.log(LogLevel.Trace, MODULE + ".processSecurityInfo", element.securityID as string, element);
    // I don't understand where the next lint error comes from...
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.processSecurityInfoUnderlying(element)
      .then(async (underlying) => {
        const ibContract = ibContractFromElement(element);
        logger.log(
          LogLevel.Trace,
          MODULE + ".processSecurityInfo",
          element.securityID as string,
          "underlying",
          underlying,
          "contract",
          ibContract,
        );
        return this.findOrCreateContract({ ibContract, force: true }).then(async (contract) => {
          if (contract.secType == SecType.STK) {
            const contract_data: any = {
              symbol: element.symbol,
              name: element.description,
              currency: element.currency,
              // isin: element.isin,
              exchange: element.listingExchange,
            };
            if (element.isin?.length > 0) contract_data.isin = element.isin;
            return contract.update(contract_data, {});
          } else if (contract.secType == SecType.BOND) {
            // IB API does not provide any usefull information for BONDs therefore we update it using XML information
            const contract_data = {
              symbol: element.isin,
              name: element.symbol,
              currency: element.currency,
              isin: element.isin,
              exchange: "BONDDESK",
            };
            const bond_data = {
              lastTradeDate: element.maturity,
              multiplier: element.multiplier,
              country: (element.isin as string).substring(0, 2),
            };
            return BondContract.findOrCreate({
              where: { id: contract.id },
              defaults: bond_data,
            }).then(async ([bond, _created]) => {
              // Don't update bond's country prop with 'XS'
              const bond_update = {
                ...bond_data,
                country: (element.isin as string).startsWith("XS")
                  ? undefined
                  : (element.isin as string).substring(0, 2),
              };
              return bond.update(bond_update).then(async (_) => contract.update(contract_data));
              // .then((contract) => {
              //   console.log(element, contract_data, contract);
              //   return contract;
              // });
            });
          }
          return contract;
        });
      })
      .catch((e) => {
        console.error("processSecurityInfo failed:", e, "element:", element);
        logger.log(LogLevel.Error, MODULE + ".processSecurityInfo", element.securityID as string, e, element);
        return undefined;
      });
  }

  private async processAllSecuritiesInfo(flexReport: FlexStatement): Promise<FlexStatement> {
    logger.trace(MODULE + ".processAllSecuritiesInfo", undefined, flexReport);
    let elements: any[];
    if (
      !flexReport.SecuritiesInfo ||
      !flexReport.SecuritiesInfo.SecurityInfo ||
      flexReport.SecuritiesInfo.SecurityInfo == ""
    ) {
      elements = [];
    } else if (flexReport.SecuritiesInfo.SecurityInfo instanceof Array) {
      elements = flexReport.SecuritiesInfo.SecurityInfo;
    } else {
      elements = [flexReport.SecuritiesInfo.SecurityInfo];
    }
    return elements
      .reduce(
        async (p: Promise<Contract | undefined>, element: any): Promise<Contract | undefined> =>
          p.then(async () =>
            this.processSecurityInfo(element).catch(async (error) => {
              logger.error(MODULE + ".processAllSecuritiesInfo", undefined, error, element);
              return Promise.resolve(undefined as undefined);
            }),
          ),
        Promise.resolve(undefined as undefined),
      )
      .then(() => {
        logger.info(MODULE + ".processAllSecuritiesInfo", undefined, "Securities info loaded");
        delete flexReport.SecuritiesInfo;
        return flexReport;
      });
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  protected async _processStockTrade(element: any): Promise<void> {
    logger.log(LogLevel.Trace, MODULE + ".processStockTrade", element.symbol as string, element);
    // if (element.symbol == "SHYL") console.log(element);
    return this.findOrCreateContract({ ibContract: ibContractFromElement(element) }).then(async (contract) =>
      Statement.findOrCreate({
        where: { transactionId: element.transactionID },
        defaults: {
          portfolio_id: this.portfolio.id,
          statementType: StatementTypes.EquityStatement,
          date: element.dateTime,
          currency: element.currency,
          netCash: element.netCash,
          description: transactionDescriptionFromElement(element),
          transactionId: element.transactionID,
          fxRateToBase: element.fxRateToBase,
          stock_id: contract?.id,
        },
      })
        .then(async ([statement, _created]) =>
          EquityStatement.findOrCreate({
            where: { id: statement.id },
            defaults: {
              id: statement.id,
              quantity: element.quantity,
              price: element.tradePrice,
              proceeds: element.proceeds,
              fees: element.ibCommission,
              realizedPnL: element.fifoPnlRealized,
              status: transactionStatusFromElement(element),
            },
          }),
        )
        .then(([_equityStatement, _created]): void => undefined),
    );
  }

  /*
 {
   accountId: '---',
   acctAlias: '',
   currency: 'USD',
   fxRateToBase: '0.92955',
   assetCategory: 'FOP',
   symbol: 'QN2M3 C14780',
   description: 'NQ 09JUN23 14780 C',
   conid: '635286755',
   securityID: '',
   securityIDType: '',
   cusip: '',
   isin: '',
   listingExchange: 'CME',
   underlyingConid: '551601533',
   underlyingSymbol: 'NQM3',
   underlyingSecurityID: '',
   underlyingListingExchange: 'CME',
   issuer: '',
   multiplier: '20',
   strike: '14780',
   expiry: '2023-06-09',
   tradeID: '55644027',
   putCall: 'C',
   reportDate: '2023-06-12',
   principalAdjustFactor: '',
   dateTime: '2023-06-09 16:20:00',
   serialNumber: '',
   tradeDate: '2023-06-09',
   deliveryType: '',
   commodityType: '',
   settleDateTarget: '2023-06-12',
   transactionType: 'BookTrade',
   exchange: '--',
   quantity: '5',
   tradePrice: '0',
   tradeMoney: '0',
   proceeds: '0',
   taxes: '0',
   ibCommission: '0',
   ibCommissionCurrency: 'USD',
   netCash: '0',
   closePrice: '0',
   openCloseIndicator: 'C',
   notes: 'Ep',
   cost: '112.9',
   fifoPnlRealized: '112.9',
   fxPnl: '0',
   mtmPnl: '0',
   transactionID: '1927093822',
   buySell: 'BUY',
   ibOrderID: '1927093822',
   ibExecID: '',
   extExecID: 'N/A',
   orderTime: '',
   levelOfDetail: 'EXECUTION',
   changeInPrice: '0',
   changeInQuantity: '0',
   orderType: '',
   isAPIOrder: 'N',
   accruedInt: '0'
 }
  */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  protected async _processOptionTrade(element: any): Promise<Statement> {
    logger.log(LogLevel.Trace, MODULE + ".processOptionTrade", element.underlyingSymbol as string, element);
    return this.processSecurityInfoUnderlying(element).then(async (underlying) =>
      Statement.findOrCreate({
        where: { transactionId: element.transactionID },
        defaults: {
          portfolio_id: this.portfolio.id,
          statementType: StatementTypes.OptionStatement,
          date: element.dateTime,
          currency: element.currency,
          netCash: element.netCash,
          description: transactionDescriptionFromElement(element),
          transactionId: element.transactionID,
          fxRateToBase: element.fxRateToBase,
          stock_id: underlying?.id,
        },
      }).then(async ([statement, _created]) =>
        this.processSecurityInfo(element).then(async (contract) =>
          OptionStatement.findOrCreate({
            where: { id: statement.id },
            defaults: {
              id: statement.id,
              quantity: element.quantity,
              price: element.tradePrice,
              proceeds: element.proceeds,
              fees: element.ibCommission,
              realizedPnL: element.fifoPnlRealized,
              status: transactionStatusFromElement(element),
              contract_id: contract?.id,
            },
          }).then((_optStatement) => statement),
        ),
      ),
    );
  }

  /*
  {
    "accountId": "---",
    "acctAlias": "",
    "currency": "EUR",
    "fxRateToBase": "1",
    "assetCategory": "BOND",
    "symbol": "RABOBK 6 1/2 PERP",
    "description": "RABOBK 6 1/2 PERP",
    "conid": "143137669",
    "securityID": "XS1002121454",
    "securityIDType": "ISIN",
    "cusip": "EK0456492",
    "isin": "XS1002121454",
    "listingExchange": "",
    "underlyingConid": "",
    "underlyingSymbol": "",
    "underlyingSecurityID": "",
    "underlyingListingExchange": "",
    "issuer": "",
    "multiplier": "1",
    "strike": "",
    "expiry": "",
    "tradeID": "642855443",
    "putCall": "",
    "reportDate": "2023-11-28",
    "principalAdjustFactor": "1",
    "dateTime": "2023-11-28 09:04:28",
    "serialNumber": "",
    "tradeDate": "2023-11-28",
    "deliveryType": "",
    "commodityType": "",
    "settleDateTarget": "2023-11-30",
    "transactionType": "ExchTrade",
    "exchange": "EURONEXT",
    "quantity": "4000",
    "tradePrice": "96.6",
    "tradeMoney": "3864",
    "proceeds": "-3864",
    "taxes": "0",
    "ibCommission": "-5.764",
    "ibCommissionCurrency": "EUR",
    "netCash": "-3869.764",
    "closePrice": "96.332",
    "openCloseIndicator": "O",
    "notes": "",
    "cost": "3869.764",
    "fifoPnlRealized": "0",
    "mtmPnl": "-10.72",
    "transactionID": "2303468007",
    "buySell": "BUY",
    "ibOrderID": "544474826",
    "ibExecID": "0000e3d0.65658324.01.01",
    "extExecID": "77313XS1002121454/B:1145027",
    "orderTime": "2023-11-28 06:08:09",
    "levelOfDetail": "EXECUTION",
    "changeInPrice": "0",
    "changeInQuantity": "0",
    "orderType": "LMT",
    "isAPIOrder": "N",
    "accruedInt": "-44.06"
  }
  */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  protected async _processBondTrade(element: any): Promise<BondStatement | null> {
    logger.log(LogLevel.Trace, MODULE + ".processBondTrade", element.securityID as string, element);
    // this.printObject(element);
    return this.findOrCreateContract({ ibContract: ibContractFromElement(element) }).then(async (contract) =>
      Statement.findOrCreate({
        where: { transactionId: element.transactionID },
        defaults: {
          portfolio_id: this.portfolio.id,
          statementType: StatementTypes.BondStatement,
          date: element.dateTime,
          currency: element.currency,
          netCash: element.netCash,
          description: transactionDescriptionFromElement(element),
          transactionId: element.transactionID,
          fxRateToBase: element.fxRateToBase,
          stock_id: contract?.id,
        },
      }).then(async ([statement, _created]) => {
        const defaults = {
          quantity: element.quantity,
          price: element.tradePrice,
          proceeds: element.proceeds,
          fees: element.ibCommission,
          accruedInterests: element.accruedInt,
          country: (element.isin as string).substring(0, 2),
          realizedPnL: element.fifoPnlRealized,
        };
        return BondStatement.findOrCreate({
          where: { id: statement.id },
          defaults,
        }).then(async ([bondstatement, _created]) => bondstatement.update(defaults));
      }),
    );
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  protected async processOneTrade(element: any): Promise<void> {
    logger.log(LogLevel.Trace, MODULE + ".processOneTrade", element.securityID as string, element);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const date = DateTime.fromISO((element.dateTime as string).replace(" ", "T"), { zone: "America/New_York" }).toISO();
    const proceeds = parseFloat(element.proceeds as string);
    let fees = parseFloat(element.ibCommission as string);
    let netCash = parseFloat(element.netCash as string);
    let description = transactionDescriptionFromElement(element);
    if (element.currency !== element.ibCommissionCurrency) {
      description += ` Fee: ${fees}${getCurrencyFromElement(element.ibCommissionCurrency as string)}`;
      // Hope that commission is portfolio currency's based when it different from transaction's commission
      if (this.portfolio.baseCurrency == element.ibCommissionCurrency) {
        fees = parseFloat(element.ibCommission as string) / parseFloat(element.fxRateToBase as string);
      } else {
        logger.error(
          MODULE + ".processStockTrade",
          "transaction and commission currencies differs, convertion needed",
          element,
        );
        console.log(element);
      }
    }

    let contract: Contract;
    let underlying: Contract;
    let statementType: StatementTypes;
    switch (element.assetCategory) {
      case SecType.STK:
      case SecType.FUT:
        statementType = StatementTypes.EquityStatement;
        contract = await this.findOrCreateContract({ ibContract: ibContractFromElement(element) });
        break;
      case SecType.CASH:
        statementType = StatementTypes.EquityStatement;
        contract = await this.findOrCreateContract({ ibContract: ibContractFromElement(element) });
        netCash = proceeds;
        break;
      case SecType.FOP:
      case SecType.OPT:
        statementType = StatementTypes.OptionStatement;
        contract = await this.processSecurityInfoUnderlying(element);
        if (!contract) {
          logger.error(MODULE + ".processOneTrade", "Contract not found for option trade", element);
          throw Error("Contract not found for option trade");
        }
        underlying = await this.processSecurityInfo(element);
        if (!underlying) {
          logger.error(MODULE + ".processOneTrade", "Underlying not found for option trade", element);
          throw Error("Underlying not found for option trade");
        }
        break;
      case SecType.BOND:
        statementType = StatementTypes.BondStatement;
        contract = await this.findOrCreateContract({ ibContract: ibContractFromElement(element) });
        break;
      default:
        logger.error(MODULE + ".processOneTrade", "Unsupported assetCategory: " + element.assetCategory, element);
        throw Error("unsupported assetCategory: " + element.assetCategory);
    }

    const [statement] = await Statement.findOrCreate({
      where: { transactionId: element.transactionID },
      defaults: {
        portfolio_id: this.portfolio.id,
        statementType,
        date,
        currency: element.currency,
        netCash,
        description,
        transactionId: element.transactionID,
        fxRateToBase: element.fxRateToBase,
        stock_id: contract?.id,
      },
    });
    switch (statement.statementType) {
      case StatementTypes.EquityStatement:
        return EquityStatement.findOrCreate({
          where: { id: statement.id },
          defaults: {
            id: statement.id,
            quantity: element.quantity,
            price: element.tradePrice,
            proceeds,
            fees,
            realizedPnL: element.fifoPnlRealized,
            status: transactionStatusFromElement(element),
          },
        }).then();
      case StatementTypes.OptionStatement:
        return OptionStatement.findOrCreate({
          where: { id: statement.id },
          defaults: {
            id: statement.id,
            quantity: element.quantity,
            price: element.tradePrice,
            proceeds,
            fees: fees,
            realizedPnL: element.fifoPnlRealized,
            status: transactionStatusFromElement(element),
            contract_id: underlying.id,
          },
        }).then();
      case StatementTypes.BondStatement:
        return BondStatement.findOrCreate({
          where: { id: statement.id },
          defaults: {
            id: statement.id,
            quantity: element.quantity,
            price: element.tradePrice,
            proceeds,
            fees: fees,
            accruedInterests: element.accruedInt,
            country: (element.isin as string).substring(0, 2),
            realizedPnL: element.fifoPnlRealized,
          },
        }).then();
    }
  }

  private async processAllTrades(flexReport: FlexStatement): Promise<FlexStatement> {
    logger.trace(MODULE + ".processAllTrades", undefined, flexReport);
    let elements: any[];
    if (!flexReport.Trades || !flexReport.Trades.Trade || flexReport.Trades.Trade == "") {
      elements = [];
    } else if (flexReport.Trades.Trade instanceof Array) {
      elements = flexReport.Trades.Trade;
    } else {
      elements = [flexReport.Trades.Trade];
    }
    return elements
      .reduce(
        async (p: Promise<void>, element: any) =>
          p
            .then(async () => this.processOneTrade(element))
            .catch((error) => logger.error(MODULE + ".processAllTrades", undefined, error, element)),
        Promise.resolve(),
      )
      .then(() => {
        delete flexReport.Trades;
        return flexReport;
      });
  }

  /*
 processCashTransaction {
   accountId: '---',
   acctAlias: '',
   model: '',
   currency: 'EUR',
   fxRateToBase: '1',
   assetCategory: '',
   symbol: '',
   description: 'DISBURSEMENT INITIATED BY ***',
   conid: '',
   securityID: '',
   securityIDType: '',
   cusip: '',
   isin: '',
   listingExchange: '',
   underlyingConid: '',
   underlyingSymbol: '',
   underlyingSecurityID: '',
   underlyingListingExchange: '',
   issuer: '',
   multiplier: '0',
   strike: '',
   expiry: '',
   putCall: '',
   principalAdjustFactor: '',
   serialNumber: '',
   deliveryType: '',
   commodityType: '',
   dateTime: '2023-06-14',
   settleDate: '2023-06-14',
   amount: '-1114.7',
   type: 'Deposits/Withdrawals',
   tradeID: '',
   code: '',
   transactionID: '193402449',
   reportDate: '2023-06-14',
   clientReference: '',
   levelOfDetail: 'DETAIL'
 }
  */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  protected async processCashTransaction(element: any): Promise<Statement | null> {
    logger.log(LogLevel.Trace, MODULE + ".processCashTransaction", element.securityID as string, element);
    let statementType: StatementTypes;
    switch (element.type) {
      case "Withholding Tax":
        statementType = StatementTypes.TaxStatement;
        break;
      case "Dividends":
      case "Payment In Lieu Of Dividends":
        statementType = StatementTypes.DividendStatement;
        break;
      case "Broker Interest Paid":
      case "Broker Interest Received":
        statementType = StatementTypes.InterestStatement;
        break;
      case "Bond Interest Paid":
      case "Bond Interest Received":
        if ((element.description as string).includes("ACCRUED")) {
          return Statement.findOne({
            where: { transactionId: element.transactionID },
          }).then(async (statement) => {
            if (statement)
              return BondStatement.findByPk(statement.id).then(async (bond_statement) => {
                if (bond_statement)
                  return bond_statement.update({ accruedInterests: element.amount }).then(() => null as null);
                else {
                  this.warn(`Bond statement #${statement.id} not found!`);
                  return null as null;
                }
              });
            else {
              this.warn(`statement not found for transactionId: ${element.transactionID}`);
              return null as null;
            }
          });
          // .catch((error) => console.error(error));
        }
        statementType = StatementTypes.InterestStatement;
        break;
      case "Deposits/Withdrawals":
        statementType = StatementTypes.CashStatement;
        break;
      case "Other Fees":
      case "Commission Adjustments":
        statementType = StatementTypes.FeeStatement;
        break;
      case "Price Adjustments":
        statementType = StatementTypes.PriceAdjustments;
        break;
      default:
        console.error("undefined cash trasaction type:", element);
        throw Error("undefined cash trasaction type: " + element.type);
    }
    return (
      element.assetCategory
        ? this.findOrCreateContract({ ibContract: ibContractFromElement(element) })
        : Promise.resolve(null)
    )
      .then(async (contract: Contract | null | undefined) =>
        Statement.findOrCreate({
          where: { transactionId: element.transactionID },
          defaults: {
            portfolio_id: this.portfolio.id,
            statementType,
            date: element.dateTime,
            currency: element.currency,
            netCash: element.amount,
            description: element.description,
            transactionId: element.transactionID,
            fxRateToBase: element.fxRateToBase,
            stock_id: contract?.id,
          },
        }),
      )
      .then(async ([statement, _created]) => {
        switch (statementType) {
          case StatementTypes.TaxStatement: // Withholding Tax
            {
              // let country = null;
              // let idx = (element.description as string).indexOf(" TAX");
              // if (idx > 0) {
              //   country = (element.description as string).substring(idx - 2, idx);
              // } else {
              //   idx = (element.description as string).indexOf("(");
              //   country = (element.description as string).substring(idx + 1, idx + 3);
              // }
              const isin = element.isin as string;
              const country = isin && isin.length > 2 ? isin.substring(0, 2) : "XX";
              return TaxStatement.findOrCreate({
                where: { id: statement.id },
                defaults: { id: statement.id, country },
              }).then(([_taxStatement, _created]) => statement);
            }
            break;

          case StatementTypes.DividendStatement:
            {
              // console.log(element);
              const isin = element.isin as string;
              const country = isin && isin.length > 2 ? isin.substring(0, 2) : "XX";
              return DividendStatement.findOrCreate({
                where: { id: statement.id },
                defaults: { id: statement.id, country },
              }).then(([_dividendStatement, _created]) => statement);
            }
            break;

          case StatementTypes.InterestStatement:
            return InterestStatement.findOrCreate({
              where: { id: statement.id },
              defaults: { id: statement.id, country: this.portfolio.country },
            }).then(([_interestStatement, _created]) => statement);

          case StatementTypes.CashStatement:
            return Promise.resolve(statement);

          case StatementTypes.FeeStatement:
            return FeeStatement.findOrCreate({ where: { id: statement.id }, defaults: { id: statement.id } }).then(
              ([_interestStatement, _created]) => statement,
            );

          case StatementTypes.PriceAdjustments:
            return Promise.resolve(statement);

          default:
            console.error(element);
            throw Error("invalid statement type");
        }
      })
      .catch((error) => {
        logger.error(MODULE + ".processCashTransaction", undefined, error, element);
        return null as null;
      });
  }

  private async processAllCashTransactions(flexReport: FlexStatement): Promise<FlexStatement> {
    let elements: any[];
    if (
      !flexReport.CashTransactions ||
      !flexReport.CashTransactions.CashTransaction ||
      flexReport.CashTransactions.CashTransaction == ""
    ) {
      elements = [];
    } else if (flexReport.CashTransactions.CashTransaction instanceof Array) {
      elements = flexReport.CashTransactions.CashTransaction;
    } else {
      elements = [flexReport.CashTransactions.CashTransaction];
    }
    return elements
      .reduce(
        async (p: Promise<any>, element: any) => p.then(async () => this.processCashTransaction(element)),
        Promise.resolve(),
      )
      .then(() => {
        delete flexReport.CashTransactions;
        return flexReport;
      });
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  protected async processCorporateAction(element: any): Promise<Statement> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    logger.log(LogLevel.Trace, MODULE + ".processCorporateAction", element.symbol, element);
    return (
      element.assetCategory
        ? this.findOrCreateContract({ ibContract: ibContractFromElement(element) })
        : Promise.resolve(null)
    )
      .then(async (contract: Contract | null | undefined) => {
        return Statement.findOrCreate({
          where: { transactionId: element.transactionID },
          defaults: {
            portfolio_id: this.portfolio.id,
            statementType: StatementTypes.CorporateStatement,
            date: element.dateTime,
            currency: element.currency,
            netCash: element.proceeds,
            description: element.description,
            transactionId: element.transactionID,
            fxRateToBase: element.fxRateToBase,
            stock_id: contract?.id,
          },
        });
      })
      .then(async ([statement, _created]) =>
        CorporateStatement.findOrCreate({
          where: { id: statement.id },
          defaults: { id: statement.id, quantity: element.quantity, pnl: element.fifoPnlRealized },
        }).then(([_subStatement, _created]) => statement),
      );
  }

  private async processAllCorporateActions(flexReport: FlexStatement): Promise<FlexStatement> {
    let elements: any[];
    if (
      !flexReport.CorporateActions ||
      !flexReport.CorporateActions.CorporateAction ||
      flexReport.CorporateActions.CorporateAction == ""
    ) {
      elements = [];
    } else if (flexReport.CorporateActions.CorporateAction instanceof Array) {
      elements = flexReport.CorporateActions.CorporateAction;
    } else {
      elements = [flexReport.CorporateActions.CorporateAction];
    }
    return elements
      .reduce(
        async (p: Promise<any>, element: any) => p.then(async () => this.processCorporateAction(element)),
        Promise.resolve(),
      )
      .then(() => {
        delete flexReport.CorporateActions;
        return flexReport;
      });
  }

  /*
{
  "accountId": "***",
  "acctAlias": "",
  "model": "",
  "currency": "EUR",
  "fxRateToBase": "1",
  "assetCategory": "",
  "subCategory": "",
  "symbol": "",
  "description": "",
  "conid": "",
  "securityID": "",
  "securityIDType": "",
  "cusip": "",
  "isin": "",
  "figi": "",
  "listingExchange": "",
  "underlyingConid": "",
  "underlyingSymbol": "",
  "underlyingSecurityID": "",
  "underlyingListingExchange": "",
  "issuer": "",
  "issuerCountryCode": "",
  "multiplier": "",
  "strike": "",
  "expiry": "",
  "putCall": "",
  "principalAdjustFactor": "",
  "date": "2024-08-02",
  "country": "France",
  "taxType": "VAT",
  "payer": "U7802803",
  "taxableDescription": "r******99:COMEX(Globex)(NP,L2)",
  "taxableAmount": "-10.16",
  "taxRate": "0.2",
  "salesTax": "-2.032",
  "taxableTransactionID": "2947603793",
  "transactionID": "3220505865",
  "code": "",
  "serialNumber": "",
  "deliveryType": "",
  "commodityType": "",
  "fineness": "",
  "weight": ""
}
*/
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  protected async processSalesTax(element: any): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    logger.log(LogLevel.Trace, MODULE + ".processSalesTaxes", element.symbol, element);
    const taxableTransaction = await Statement.findOne({
      where: { transactionId: element.taxableTransactionID },
    });
    if (taxableTransaction) {
      return Statement.findOrCreate({
        where: { transactionId: element.transactionID },
        defaults: {
          portfolio_id: this.portfolio.id,
          statementType: StatementTypes.SalesTaxStatement,
          date: taxableTransaction.date,
          currency: element.currency,
          netCash: element.salesTax,
          description: `${element.country} ${element.taxType} tax for ${element.taxableDescription}`,
          transactionId: element.transactionID,
          fxRateToBase: element.fxRateToBase,
        },
      })
        .then(async ([statement, _created]) => {
          return SalesTaxes.findOrCreate({
            where: { id: statement.id },
            defaults: {
              id: statement.id,
              taxableTransactionID: taxableTransaction.id,
              country: element.country,
              taxType: element.taxType,
              taxableAmount: element.taxableAmount,
              taxRate: element.taxRate,
              salesTax: element.salesTax,
            },
          });
        })
        .then(([_taxStatement, _created]): void => undefined);
    } else {
      logger.log(
        LogLevel.Error,
        MODULE + ".processSalesTaxes",
        element.symbol as string,
        "taxableTransactionID not found",
        element.taxableTransactionID,
      );
    }

    return Promise.resolve();
  }

  private async processAllSalesTaxes(flexReport: FlexStatement): Promise<FlexStatement> {
    let elements: any[];
    if (!flexReport.SalesTaxes || !flexReport.SalesTaxes.SalesTax) {
      elements = [];
    } else if (flexReport.SalesTaxes.SalesTax instanceof Array) {
      elements = flexReport.SalesTaxes.SalesTax;
    } else {
      elements = [flexReport.SalesTaxes.SalesTax];
    }
    return elements
      .reduce(
        async (p: Promise<any>, element: any) => p.then(async () => this.processSalesTax(element)),
        Promise.resolve(),
      )
      .then(() => {
        delete flexReport.SalesTaxes;
        return flexReport;
      });
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  protected async processTransactionTaxes(element: any): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    logger.log(LogLevel.Trace, MODULE + ".processTransactionTaxes", element.symbol, element);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    logger.log(LogLevel.Warning, MODULE + ".processTransactionTaxes", element.symbol, "not implemented", element);
    return Promise.resolve();
  }

  private async processAllTransactionTaxes(flexReport: FlexStatement): Promise<FlexStatement> {
    let elements: any[];
    if (!flexReport.TransactionTaxes || !flexReport.TransactionTaxes.TransactionTax) {
      elements = [];
    } else if (flexReport.TransactionTaxes.TransactionTax instanceof Array) {
      elements = flexReport.TransactionTaxes.TransactionTax;
    } else {
      elements = [flexReport.TransactionTaxes.TransactionTax];
    }
    return elements
      .reduce(
        async (p: Promise<any>, element: any) => p.then(async () => this.processTransactionTaxes(element)),
        Promise.resolve(),
      )
      .then(() => {
        delete flexReport.TransactionTaxes;
        return flexReport;
      });
  }

  private async processAccountInfo(flexReport: FlexStatement): Promise<FlexStatement> {
    return Portfolio.findOrCreate({
      where: {
        account: flexReport.AccountInformation.accountId,
        baseCurrency: flexReport.AccountInformation.currency,
      },
      defaults: {
        account: flexReport.AccountInformation.accountId,
        baseCurrency: flexReport.AccountInformation.currency,
        name: flexReport.AccountInformation.name,
        country: (flexReport.AccountInformation.ibEntity as string).substring(3),
      },
    }).then(() => {
      delete flexReport.AccountInformation;
      return flexReport;
    });
  }

  private processOtherStatements(flexReport: FlexStatement): FlexStatement {
    // Ignore the following FlexStatement entries
    delete flexReport.accountId;
    delete flexReport.fromDate;
    delete flexReport.period;
    delete flexReport.toDate;
    delete flexReport.whenGenerated;
    delete flexReport.EquitySummaryInBase; // Ignore NAV history
    delete flexReport.OptionEAE; // Ignore Options expirations assigments excersizes
    // Warning message if any entries left
    const keys = Object.keys(flexReport);
    if (keys.length > 0) logger.warn(MODULE + ".processOtherStatements", "Unimplemented keys:", keys.join(","));
    keys.forEach((key) => {
      console.error(`Unimplemented key: '${key}'`, flexReport[key]);
    });
    return flexReport;
  }

  protected async processReport(flexReport: FlexStatement): Promise<void> {
    logger.log(LogLevel.Info, MODULE + ".processReport", undefined, flexReport.AccountInformation);
    return this.processAccountInfo(flexReport)
      .then(async (flexReport) => this.processAllSecuritiesInfo(flexReport))
      .then(async (flexReport) => this.processAllTrades(flexReport))
      .then(async (flexReport) => this.processAllCashTransactions(flexReport))
      .then(async (flexReport) => this.processAllCorporateActions(flexReport))
      .then(async (flexReport) => this.processAllSalesTaxes(flexReport))
      .then(async (flexReport) => this.processAllTransactionTaxes(flexReport))
      .then((flexReport) => this.processOtherStatements(flexReport))
      .then(() => logger.log(LogLevel.Info, MODULE + ".processReport", undefined, "Report loaded"))
      .catch((error) => logger.error(MODULE + ".processReport", undefined, "importer bot process report:", error));
  }

  protected async fetchReport(url: string): Promise<void> {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
    });
    logger.info(MODULE + ".fetchReport", "Fetching report at " + url);
    return fetch(url) // eslint-disable-line @typescript-eslint/no-unsafe-return
      .then(async (response) => response.text())
      .then((XMLdata) => {
        const jObj = parser.parse(XMLdata);
        if (jObj["FlexQueryResponse"]) {
          if (jObj["FlexQueryResponse"].FlexStatements.FlexStatement instanceof Array) {
            // disable the following eslint test because I was unable to fix it
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call
            return jObj["FlexQueryResponse"].FlexStatements.FlexStatement.reduce(
              async (p: Promise<void>, element: any): Promise<void> =>
                p.then(async (): Promise<void> => this.processReport(element as FlexStatement)),
              Promise.resolve() as Promise<void>,
            );
          } else {
            return this.processReport(jObj["FlexQueryResponse"].FlexStatements.FlexStatement as FlexStatement);
          }
        } else if (jObj["FlexStatementResponse"]?.Status == "Warn" && jObj["FlexStatementResponse"].ErrorCode == 1019) {
          // Retry
          return awaitTimeout(1).then(async () => this.fetchReport(url));
        } else if (jObj["FlexStatementResponse"]?.ErrorMessage) {
          throw Error("Can't fetch data" + jObj["FlexStatementResponse"].ErrorMessage);
        } else {
          console.error(jObj);
          throw Error("Can't fetch data");
        }
      })
      .catch((error) => console.error("importer bot fetch report:", error));
  }

  protected async process(): Promise<void> {
    return (
      fetch(
        `https://gdcdyn.interactivebrokers.com/Universal/servlet/FlexStatementService.SendRequest?t=${this.token}&q=${this.query}&v=3`,
      )
        .then(async (response) => response.text())
        .then(async (XMLdata) => {
          const parser = new XMLParser();
          const jObj = parser.parse(XMLdata);
          if (jObj["FlexStatementResponse"]?.Status == "Success") {
            return this.fetchReport(
              `${jObj["FlexStatementResponse"].Url}?q=${jObj["FlexStatementResponse"].ReferenceCode}&t=${this.token}&v=3`,
            );
          } else if (jObj["FlexStatementResponse"]?.ErrorMessage) {
            throw Error("Can t fetch data: " + jObj["FlexStatementResponse"].ErrorMessage);
          } else {
            console.error(jObj);
            throw Error("Can t fetch data");
          }
        })
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        .catch((error) => logger.error(MODULE + ".process", "importer bot fetch:", error.toString()))
    );
  }

  public start(): void {
    this.init()
      .then(async () => {
        setInterval((): void => {
          this.process().catch((error) => logger.error(MODULE + ".start", error));
        }, 3600 * 1000); // On every hour
        return awaitTimeout(3).then(async () => this.process());
      })
      .catch((error) => console.error("start importer bot:", error));
  }
}
