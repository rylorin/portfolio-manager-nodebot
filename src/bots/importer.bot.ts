import { IBApiNext, Contract as IbContract, SecType } from "@stoqey/ib";
import { XMLParser } from "fast-xml-parser";
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
  Statement,
  StatementStatus,
  TaxStatement,
} from "../models";
import { BondStatement } from "../models/bond_statement.model";
import { StatementTypes } from "../models/statement.types";

const MODULE = "ImporterBot";

const ibContractFromElement = (element: any): IbContract => {
  const ibContract: IbContract = {
    secType: element.assetCategory,
    conId: element.conid,
    symbol:
      element.assetCategory == SecType.OPT || element.assetCategory == SecType.FOP
        ? element.underlyingSymbol
        : element.symbol,
    exchange: element.listingExchange,
    currency: element.currency,
    strike: element.strike,
    lastTradeDateOrContractMonth: element.expiry,
    multiplier: element.multiplier,
    right: element.putCall,
    description: element.description,
    localSymbol: element.symbol,
  };
  //   console.log(ibContract);
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
    exchange: element.underlyingListingExchange,
    currency: element.currency,
  };
  //   console.log(ibContract);
  return ibContract;
};

const transactionStatusFromElement = (element: any): StatementStatus => {
  if (element.notes == "A") return StatementStatus.ASSIGNED_STATUS;
  else if (element.notes == "Ep") return StatementStatus.EXPIRED_STATUS;
  else if (element.notes == "Ex") return StatementStatus.EXERCISED_STATUS;
  else if (element.openCloseIndicator == "O") return StatementStatus.OPEN_STATUS;
  else if (element.openCloseIndicator == "C") return StatementStatus.CLOSE_STATUS;
  console.error("unknown status: ", element);
  throw Error("undefined status");
  //   const key = element.notes.length ? element.openCloseIndicator + ";" + element.notes : element.openCloseIndicator;
  // switch (key) {
  //     case "O;A":
  //     case "C;A":
  //       return StatementStatus.ASSIGNED_STATUS;
  //     case "C;Ep":
  //       return StatementStatus.EXPIRED_STATUS;
  //     case "O":
  //     case "C;O":
  //     case "O;P": // What does P mean?
  //       return StatementStatus.OPEN_STATUS;
  //     case "C":
  //     case "C;P":
  //     case "C;IA":
  //       return StatementStatus.CLOSE_STATUS;
  //     case "O;Ex":
  //     case "C;Ex":
  //       return StatementStatus.EXERCISED_STATUS;
  //     case ";P": // What does P mean?
  //     case "":
  //       return StatementStatus.UNDEFINED_STATUS;
  //     default:
  //       console.error("unknown status: ", key);
  //       console.error(element);
  //       throw Error("undefined status: " + key);
  //       return StatementStatus.UNDEFINED_STATUS;
  //   }
};

const getCurrencyFromElement = (element: any): string => {
  switch (element.currency) {
    case "USD":
      return "$";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    default:
      return element.currency as string;
  }
};

const transactionDescriptionFromElement = (element: any): string => {
  let description = "";
  switch (transactionStatusFromElement(element)) {
    case StatementStatus.ASSIGNED_STATUS:
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
    default:
      description += element.notes;
  }
  return (
    description +
    " " +
    (element.assetCategory == "BOND"
      ? Math.round(element.quantity / 1000) + "k" + getCurrencyFromElement(element)
      : element.quantity) +
    " " +
    (element.assetCategory == "STK" ? element.symbol : element.description) +
    "@" +
    element.tradePrice +
    (element.assetCategory == "BOND" ? "%" : getCurrencyFromElement(element))
  );
};

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
  protected processSecurityInfoUnderlying(element: any): Promise<Contract> | Promise<undefined> {
    if (element.underlyingConid) {
      return this.findOrCreateContract(ibUnderlyingContractFromElement(element));
    } else return Promise.resolve(undefined);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  protected processSecurityInfo(element: any): Promise<Contract | undefined> {
    logger.log(LogLevel.Trace, MODULE + ".processSecurityInfo", element.securityID as string, element);
    // I don't understand where the next lint error comes from...
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.processSecurityInfoUnderlying(element)
      .then((underlying) => {
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
        return this.findOrCreateContract(ibContract).then((contract) => {
          if (contract.secType == SecType.BOND) {
            logger.log(LogLevel.Trace, MODULE + ".processSecurityInfo", undefined, element);
            // IB API does not provide any usefull information for BONDs therefore we update it using XML information
            const contract_data = {
              symbol: element.securityID,
              name: element.symbol,
              currency: element.currency,
            };
            const bond_data = {
              lastTradeDate: element.maturity,
              multiplier: element.multiplier,
            };
            return BondContract.findOrCreate({
              where: { id: contract.id },
              defaults: bond_data,
            }).then(([bond, _created]) => {
              return bond.update(bond_data).then((_) => contract.update(contract_data));
            });
            // return Bond.update(bond_data, { where: { id: contract.id } }).then((_count) => {
            //   return contract.update(contract_data);
            // });
          }
          return contract;
        });
      })
      .catch((e) => {
        logger.log(LogLevel.Error, MODULE + ".processSecurityInfo", undefined, e, element);
        return undefined;
      });
  }

  private processAllSecuritiesInfo(element: any): Promise<any> {
    // console.log("processAllSecuritiesInfo");
    if (element instanceof Array) {
      return element.reduce(
        (p: Promise<any>, element: any): Promise<any> => p.then(() => this.processSecurityInfo(element)),
        Promise.resolve(undefined),
      );
    } else if (element) return this.processSecurityInfo(element);
    else return Promise.resolve(undefined);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  protected processStockTrade(element: any): Promise<void> {
    // if (element.symbol == "PSEC")
    logger.log(LogLevel.Trace, MODULE + ".processStockTrade", element.symbol as string, element);
    return this.processSecurityInfo(element).then((contract) =>
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
        .then(([statement, _created]) =>
          EquityStatement.findOrCreate({
            where: { id: statement.id },
            defaults: {
              id: statement.id,
              quantity: element.quantity,
              price: element.price,
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
   tradeID: '556404027',
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
  protected processOptionTrade(element: any): Promise<Statement> {
    logger.log(LogLevel.Trace, MODULE + ".processOptionTrade", element.underlyingSymbol as string, element);
    return this.processSecurityInfoUnderlying(element).then((underlying) =>
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
      }).then(([statement, _created]) =>
        this.processSecurityInfo(element).then((contract) =>
          OptionStatement.findOrCreate({
            where: { id: statement.id },
            defaults: {
              id: statement.id,
              quantity: element.quantity,
              price: element.price,
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
  protected processBondTrade(element: any): Promise<BondStatement | null> {
    logger.log(LogLevel.Trace, MODULE + ".processBondTrade", element.securityID as string, element);
    // this.printObject(element);
    return this.processSecurityInfo(element).then((contract) =>
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
      }).then(([statement, _created]) =>
        BondStatement.findOrCreate({
          where: { id: statement.id },
          defaults: {
            quantity: element.quantity,
            price: element.tradePrice,
            proceeds: element.proceeds,
            fees: element.ibCommission,
            accruedInterests: element.accruedInt,
          },
        }).then(([bondstatement, _created]) => bondstatement),
      ),
    );
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  protected processOneTrade(element: any): Promise<void> {
    switch (element.assetCategory) {
      case SecType.STK:
      case SecType.FUT:
      case SecType.CASH:
        return this.processStockTrade(element).then((): void => undefined);
      case SecType.FOP:
      case SecType.OPT:
        return this.processOptionTrade(element).then((): void => undefined);
      case SecType.BOND:
        return this.processBondTrade(element).then((): void => undefined);
      default:
        logger.error(MODULE + ".processOneTrade", "Unsupported assetCategory: " + element.assetCategory, element);
        throw Error("unsupported assetCategory: " + element.assetCategory);
    }
  }

  private processAllTrades(element: any): Promise<void> {
    if (element instanceof Array) {
      return element.reduce(
        (p: Promise<void>, element: any) => p.then(() => this.processOneTrade(element)),
        Promise.resolve(),
      );
    } else if (element) {
      return this.processOneTrade(element).then((): void => undefined);
    } else return Promise.resolve();
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
   description: 'DISBURSEMENT INITIATED BY Ronan-Yann Lorin',
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
   amount: '-11914.7',
   type: 'Deposits/Withdrawals',
   tradeID: '',
   code: '',
   transactionID: '1934082449',
   reportDate: '2023-06-14',
   clientReference: '',
   levelOfDetail: 'DETAIL'
 }
  */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  protected processCashTransaction(element: any): Promise<Statement | null> {
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
        // Ignore Accrued interests as they are saved with purchasing transaction
        if ((element.description as string).includes("ACCRUED")) return Promise.resolve(null as unknown as Statement);
        statementType = StatementTypes.InterestStatement;
        break;
      case "Deposits/Withdrawals":
        statementType = StatementTypes.CashStatement;
        break;
      case "Other Fees":
      case "Commission Adjustments":
        statementType = StatementTypes.FeeStatement;
        break;
      default:
        console.error("undefined cash trasaction type:", element);
        throw Error("undefined cash trasaction type: " + element.type);
    }
    return (element.assetCategory ? this.processSecurityInfo(element) : Promise.resolve(null))
      .then((contract: Contract | null | undefined) => {
        return Statement.findOrCreate({
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
          //   logging: console.log,
        });
      })
      .then(([statement, _created]) => {
        switch (statementType) {
          case StatementTypes.TaxStatement:
            {
              const idx = (element.description as string).indexOf("(");
              const country = (element.description as string).substring(idx + 1, idx + 3);
              return TaxStatement.findOrCreate({
                where: { id: statement.id },
                defaults: { id: statement.id, country },
              }).then(([_taxStatement, _created]) => statement);
            }
            break;
          case StatementTypes.DividendStatement:
            {
              const idx = (element.description as string).indexOf("(");
              const country = (element.description as string).substring(idx + 1, idx + 3);
              return DividendStatement.findOrCreate({
                where: { id: statement.id },
                defaults: { id: statement.id, country },
              }).then(([_dividendStatement, _created]) => statement);
            }
            break;
          case StatementTypes.InterestStatement:
            return InterestStatement.findOrCreate({ where: { id: statement.id }, defaults: { id: statement.id } }).then(
              ([_interestStatement, _created]) => statement,
            );
          case StatementTypes.CashStatement:
            return Promise.resolve(statement);
          case StatementTypes.FeeStatement:
            return FeeStatement.findOrCreate({ where: { id: statement.id }, defaults: { id: statement.id } }).then(
              ([_interestStatement, _created]) => statement,
            );
          default:
            throw Error("invalide statement type: " + statementType);
        }
      });
  }

  private processAllCashTransactions(element: any): Promise<any> {
    if (element instanceof Array) {
      return element.reduce(
        (p: Promise<any>, element: any) => p.then(() => this.processCashTransaction(element)),
        Promise.resolve(),
      );
    } else if (element) {
      return this.processCashTransaction(element);
    } else return Promise.resolve();
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  protected processCorporateAction(element: any): void {
    console.log("processCorporateAction", element);
  }

  private processAllCorporateActions(element: any): Promise<void> {
    if (element.CorporateActions.CorporateAction instanceof Array) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      element.CorporateActions.CorporateAction.forEach((element) => this.processCorporateAction(element));
    } else if (element.CorporateActions.CorporateAction) {
      this.processCorporateAction(element.CorporateActions.CorporateAction);
    }
    return Promise.resolve();
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  protected processReport(element: any): Promise<void> {
    logger.log(LogLevel.Info, MODULE + ".processReport", undefined, element.AccountInformation);
    return Portfolio.findOrCreate({
      where: {
        account: element.AccountInformation.accountId,
        baseCurrency: element.AccountInformation.currency,
      },
      defaults: {
        account: element.AccountInformation.accountId,
        baseCurrency: element.AccountInformation.currency,
        name: element.AccountInformation.name,
      },
    })
      .then(([_portfolio, _created]) => this.processAllSecuritiesInfo(element.SecuritiesInfo.SecurityInfo))
      .then(() => this.processAllTrades(element.Trades.Trade))
      .then(() => this.processAllCashTransactions(element.CashTransactions.CashTransaction))
      .then(() => this.processAllCorporateActions(element))
      .then(() => logger.log(LogLevel.Info, MODULE + ".processReport", undefined, "Report loaded"))
      .then(() => Promise.resolve())
      .catch((error) => console.error("importer bot process report:", error));
  }

  protected fetchReport(url: string): Promise<any> {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
    });
    logger.info(MODULE + ".fetchReport", "Fetching report at " + url);
    return fetch(url)
      .then((response) => response.text())
      .then((XMLdata) => {
        const jObj = parser.parse(XMLdata);
        if (jObj["FlexQueryResponse"]) {
          if (jObj["FlexQueryResponse"].FlexStatements.FlexStatement instanceof Array) {
            // disable the following eslint test because I was unable to fix it
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call
            return jObj["FlexQueryResponse"].FlexStatements.FlexStatement.reduce(
              (p: Promise<void>, element: any): Promise<void> =>
                p.then((): Promise<void> => this.processReport(element)),
              Promise.resolve(),
            );
          } else {
            return this.processReport(jObj["FlexQueryResponse"].FlexStatements.FlexStatement);
          }
        } else if (jObj["FlexStatementResponse"]?.Status == "Warn" && jObj["FlexStatementResponse"].ErrorCode == 1019) {
          // Retry
          return awaitTimeout(1).then(() => this.fetchReport(url));
        } else if (jObj["FlexStatementResponse"]?.ErrorMessage) {
          throw Error("Can t fetch data" + jObj["FlexStatementResponse"].ErrorMessage);
        } else {
          console.error(jObj);
          throw Error("Can t fetch data");
        }
      })
      .catch((error) => console.error("importer bot fetch report:", error));
  }

  protected process(): Promise<any> {
    return (
      fetch(
        `https://gdcdyn.interactivebrokers.com/Universal/servlet/FlexStatementService.SendRequest?t=${this.token}&q=${this.query}&v=3`,
      )
        .then((response) => response.text())
        .then((XMLdata) => {
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
      .then(() => {
        setInterval((): void => {
          this.process().catch((error) => logger.error(MODULE + ".start", error));
        }, 3600 * 1000); // On every hour
        return awaitTimeout(3).then(() => this.process());
      })
      .catch((error) => console.error("start importer bot:", error));
  }
}
