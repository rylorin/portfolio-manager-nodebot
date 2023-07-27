import { IBApiNext, Contract as IbContract, SecType } from "@stoqey/ib";
import { XMLParser } from "fast-xml-parser";
import { ITradingBot, awaitTimeout } from ".";
import { MyTradingBotApp } from "..";
import logger, { LogLevel } from "../logger";
import {
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
  const key = element.notes.length ? element.openCloseIndicator + ";" + element.notes : element.openCloseIndicator;
  switch (key) {
    case "O;A":
    case "C;A":
      return StatementStatus.ASSIGNED_STATUS;
    case "C;Ep":
      return StatementStatus.EXPIRED_STATUS;
    case "O":
    case "C;O":
    case "O;P": // What does P mean?
      return StatementStatus.OPEN_STATUS;
    case "C":
    case "C;P":
      return StatementStatus.CLOSE_STATUS;
    case "O;Ex":
    case "C;Ex":
      return StatementStatus.EXERCISED_STATUS;
    case ";P": // What does P mean?
    case "":
      return StatementStatus.UNDEFINED_STATUS;
    default:
      console.error("unknown status: ", key);
      console.error(element);
      throw Error("undefined status: " + key);
      return StatementStatus.UNDEFINED_STATUS;
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
    element.quantity +
    " " +
    (element.assetCategory == "STK" ? element.symbol : element.description) +
    "@" +
    element.tradePrice +
    element.currency
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
[0] processSecurityInfo {
[0]   assetCategory: 'FOP',
[0]   symbol: 'QN2M3 C14780',
[0]   description: 'NQ 09JUN23 14780 C',
[0]   conid: '635286755',
[0]   securityID: '',
[0]   listingExchange: 'CME',
[0]   multiplier: '20',
[0]   subCategory: 'C',
[0]   code: '',
[0]   currency: 'USD',
[0]   issuer: '',
[0]   underlyingCategory: 'FUT',
[0]   underlyingConid: '551601533',
[0]   underlyingSymbol: 'NQM3',
[0]   underlyingListingExchange: 'CME',
[0]   settlementPolicyMethod: 'Delivery',
[0]   strike: '14780',
[0]   expiry: '2023-06-09',
[0]   putCall: 'C',
[0]   securityIDType: '',
[0]   cusip: '',
[0]   isin: '',
[0]   underlyingSecurityID: '',
[0]   fineness: '0.0',
[0]   maturity: '',
[0]   issueDate: '',
[0]   deliveryType: '',
[0]   commodityType: '',
[0]   principalAdjustFactor: '',
[0]   weight: '0.0 ()',
[0]   serialNumber: ''
[0] }
  */
  protected processSecurityInfoUnderlying(element: any): Promise<Contract> | Promise<undefined> {
    if (element.underlyingConid) {
      return this.findOrCreateContract(ibUnderlyingContractFromElement(element));
    } else return Promise.resolve(undefined);
  }

  protected processSecurityInfo(element: any): Promise<Contract> {
    // console.log(element.symbol);
    return this.processSecurityInfoUnderlying(element).then((_underlying) =>
      this.findOrCreateContract(ibContractFromElement(element)),
    );
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

  /*
[0] {
[0]   accountId: 'U7802803',
[0]   acctAlias: '',
[0]   currency: 'USD',
[0]   fxRateToBase: '0.92955',
[0]   assetCategory: 'FOP',
[0]   symbol: 'QN2M3 C14780',
[0]   description: 'NQ 09JUN23 14780 C',
[0]   conid: '635286755',
[0]   securityID: '',
[0]   securityIDType: '',
[0]   cusip: '',
[0]   isin: '',
[0]   listingExchange: 'CME',
[0]   underlyingConid: '551601533',
[0]   underlyingSymbol: 'NQM3',
[0]   underlyingSecurityID: '',
[0]   underlyingListingExchange: 'CME',
[0]   issuer: '',
[0]   multiplier: '20',
[0]   strike: '14780',
[0]   expiry: '2023-06-09',
[0]   tradeID: '556404027',
[0]   putCall: 'C',
[0]   reportDate: '2023-06-12',
[0]   principalAdjustFactor: '',
[0]   dateTime: '2023-06-09 16:20:00',
[0]   serialNumber: '',
[0]   tradeDate: '2023-06-09',
[0]   deliveryType: '',
[0]   commodityType: '',
[0]   settleDateTarget: '2023-06-12',
[0]   transactionType: 'BookTrade',
[0]   exchange: '--',
[0]   quantity: '5',
[0]   tradePrice: '0',
[0]   tradeMoney: '0',
[0]   proceeds: '0',
[0]   taxes: '0',
[0]   ibCommission: '0',
[0]   ibCommissionCurrency: 'USD',
[0]   netCash: '0',
[0]   closePrice: '0',
[0]   openCloseIndicator: 'C',
[0]   notes: 'Ep',
[0]   cost: '112.9',
[0]   fifoPnlRealized: '112.9',
[0]   fxPnl: '0',
[0]   mtmPnl: '0',
[0]   transactionID: '1927093822',
[0]   buySell: 'BUY',
[0]   ibOrderID: '1927093822',
[0]   ibExecID: '',
[0]   extExecID: 'N/A',
[0]   orderTime: '',
[0]   levelOfDetail: 'EXECUTION',
[0]   changeInPrice: '0',
[0]   changeInQuantity: '0',
[0]   orderType: '',
[0]   isAPIOrder: 'N',
[0]   accruedInt: '0'
[0] }
  */
  protected processStockTrade(element: any): Promise<EquityStatement | null> {
    return this.processSecurityInfo(element).then((contract) =>
      Statement.findOrCreate({
        where: { transactionId: element.transactionID },
        defaults: {
          portfolio_id: this.portfolio.id,
          statementType: StatementTypes.EquityStatement,
          date: element.dateTime,
          currency: element.currency,
          amount: element.netCash,
          description: transactionDescriptionFromElement(element),
          transactionId: element.transactionID,
          fxRateToBase: element.fxRateToBase,
          stock_id: contract?.id,
        },
      }).then(([statement, created]) => {
        if (created) {
          logger.log(LogLevel.Debug, MODULE + ".processStockTrade", element.symbol, element);
          return EquityStatement.create({
            id: statement.id,
            quantity: element.quantity,
            price: element.price,
            proceeds: element.proceeds,
            fees: element.ibCommission,
            realizedPnL: element.fifoPnlRealized,
            status: transactionStatusFromElement(element),
          });
        } else {
          return EquityStatement.findByPk(statement.id);
        }
      }),
    );
  }

  protected processOptionTrade(element: any): Promise<Statement> {
    // console.log("processStockTrade", element);
    return this.processSecurityInfoUnderlying(element).then((contract) =>
      Statement.findOrCreate({
        where: { transactionId: element.transactionID },
        defaults: {
          portfolio_id: this.portfolio.id,
          statementType: StatementTypes.OptionStatement,
          date: element.dateTime,
          currency: element.currency,
          amount: element.netCash,
          description: transactionDescriptionFromElement(element),
          transactionId: element.transactionID,
          fxRateToBase: element.fxRateToBase,
          stock_id: contract?.id,
        },
      }).then(([statement, created]) => {
        if (created) {
          logger.log(LogLevel.Debug, MODULE + ".processOptionTrade", element.underlyingSymbol, element);
          return this.processSecurityInfo(element).then((contract) =>
            OptionStatement.create({
              id: statement.id,
              quantity: element.quantity,
              price: element.price,
              proceeds: element.proceeds,
              fees: element.ibCommission,
              realizedPnL: element.fifoPnlRealized,
              status: transactionStatusFromElement(element),
              contract_id: contract?.id,
            }).then((_optStatement) => statement),
          );
        } else {
          return statement;
        }
      }),
    );
  }

  protected processOneTrade(element: any): Promise<void> {
    switch (element.assetCategory) {
      case SecType.STK:
      case SecType.FUT:
      case SecType.CASH:
        return this.processStockTrade(element).then((): void => undefined);
      case SecType.FOP:
      case SecType.OPT:
        return this.processOptionTrade(element).then((): void => undefined);
      default:
        logger.error(MODULE + ".processOneTrade", "Unsupported assetCategory: " + element.assetCategory);
        logger.debug(element);
        throw Error("unsupported assetCategory: " + element.assetCategory);
    }
  }

  private processAllTrades(element: any): Promise<void> {
    // console.log("processAllStatements", element);
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
[0] processCashTransaction {
[0]   accountId: 'U7802803',
[0]   acctAlias: '',
[0]   model: '',
[0]   currency: 'EUR',
[0]   fxRateToBase: '1',
[0]   assetCategory: '',
[0]   symbol: '',
[0]   description: 'DISBURSEMENT INITIATED BY Ronan-Yann Lorin',
[0]   conid: '',
[0]   securityID: '',
[0]   securityIDType: '',
[0]   cusip: '',
[0]   isin: '',
[0]   listingExchange: '',
[0]   underlyingConid: '',
[0]   underlyingSymbol: '',
[0]   underlyingSecurityID: '',
[0]   underlyingListingExchange: '',
[0]   issuer: '',
[0]   multiplier: '0',
[0]   strike: '',
[0]   expiry: '',
[0]   putCall: '',
[0]   principalAdjustFactor: '',
[0]   serialNumber: '',
[0]   deliveryType: '',
[0]   commodityType: '',
[0]   dateTime: '2023-06-14',
[0]   settleDate: '2023-06-14',
[0]   amount: '-11914.7',
[0]   type: 'Deposits/Withdrawals',
[0]   tradeID: '',
[0]   code: '',
[0]   transactionID: '1934082449',
[0]   reportDate: '2023-06-14',
[0]   clientReference: '',
[0]   levelOfDetail: 'DETAIL'
[0] }
  */
  protected processCashTransaction(element: any): Promise<Statement | null> {
    // console.log("processCashTransaction", element);
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
      case "Deposits/Withdrawals":
        statementType = StatementTypes.CashStatement;
        break;
      case "Other Fees":
      case "Commission Adjustments":
        statementType = StatementTypes.FeeStatement;
        break;
      default:
        console.error("undefined cash trasaction type:", element);
        throw Error("undefined cash trasaction type:" + element.type);
    }
    return (element.assetCategory ? this.processSecurityInfo(element) : Promise.resolve(null))
      .then((contract: Contract | null) => {
        const defaults = {
          portfolio_id: this.portfolio.id,
          statementType,
          date: element.dateTime,
          currency: element.currency,
          amount: element.amount,
          description: element.description,
          transactionId: element.transactionID,
          fxRateToBase: element.fxRateToBase,
          stock_id: contract?.id,
        };
        return Statement.findOrCreate({
          where: { transactionId: element.transactionID },
          defaults,
          //   logging: console.log,
        });
      })
      .then(([statement, created]) => {
        if (created) {
          switch (statementType) {
            case StatementTypes.TaxStatement:
              {
                const idx = (element.description as string).indexOf("(");
                const country = (element.description as string).substring(idx + 1, idx + 3);
                return TaxStatement.create({ id: statement.id, country }).then((_taxStatement) => statement);
              }
              break;
            case StatementTypes.DividendStatement:
              {
                const idx = (element.description as string).indexOf("(");
                const country = (element.description as string).substring(idx + 1, idx + 3);
                return DividendStatement.create({ id: statement.id, country }).then((_dividendStatement) => statement);
              }
              break;
            case StatementTypes.InterestStatement:
              return InterestStatement.create({ id: statement.id }).then((_interestStatement) => statement);
              break;
            case StatementTypes.CashStatement:
              return Promise.resolve(statement);
              break;
            case StatementTypes.FeeStatement:
              return FeeStatement.create({ id: statement.id }).then((_interestStatement) => statement);
              break;
            default:
              throw Error("invalide statement type: " + statementType);
          }
        }
        return statement;
      });
  }

  private processAllCashTransactions(element: any): Promise<any> {
    // console.log("processAllCashTransactions", element);
    if (element instanceof Array) {
      return element.reduce(
        (p: Promise<any>, element: any) => p.then(() => this.processCashTransaction(element)),
        Promise.resolve(),
      );
    } else if (element) {
      return this.processCashTransaction(element);
    } else return Promise.resolve();
  }

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

  protected processReport(element: any): Promise<void> {
    console.log("AccountInformation", element.AccountInformation);
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
        if (jObj.FlexQueryResponse) {
          if (jObj.FlexQueryResponse.FlexStatements.FlexStatement instanceof Array) {
            // disable the following eslint test because I was unable to fix it
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call
            return jObj.FlexQueryResponse.FlexStatements.FlexStatement.reduce(
              (p: Promise<void>, element: any): Promise<void> =>
                p.then((): Promise<void> => this.processReport(element)),
              Promise.resolve(),
            );
          } else {
            return this.processReport(jObj.FlexQueryResponse.FlexStatements.FlexStatement);
          }
        } else if (jObj.FlexStatementResponse?.Status == "Warn" && jObj.FlexStatementResponse.ErrorCode == 1019) {
          // Retry
          return awaitTimeout(1).then(() => this.fetchReport(url));
        } else if (jObj.FlexStatementResponse?.ErrorMessage) {
          throw Error("Can t fetch data" + jObj.FlexStatementResponse.ErrorMessage);
        } else {
          console.error(jObj);
          throw Error("Can t fetch data");
        }
      })
      .catch((error) => console.error("importer bot fetch report:", error));
  }

  protected process(): Promise<any> {
    const parser = new XMLParser();
    return fetch(
      `https://gdcdyn.interactivebrokers.com/Universal/servlet/FlexStatementService.SendRequest?t=${this.token}&q=${this.query}&v=3`,
    )
      .then((response) => response.text())
      .then((XMLdata) => {
        const jObj = parser.parse(XMLdata);
        if (jObj.FlexStatementResponse.Status == "Success") {
          return this.fetchReport(
            `${jObj.FlexStatementResponse.Url}?q=${jObj.FlexStatementResponse.ReferenceCode}&t=${this.token}&v=3`,
          );
        } else throw Error("Can t fetch data" + jObj.FlexStatementResponse.ErrorMessage);
      })
      .catch((error) => console.error("importer bot fetch:", error));
  }

  public start(): void {
    this.init()
      .then(() => {
        // const awaitTimeout = (delay: number): Promise<unknown> =>
        //   new Promise((resolve): NodeJS.Timeout => setTimeout(resolve, delay * 1000));
        return awaitTimeout(5).then(() => this.process());
      })
      .catch((error) => console.error("start importer bot:", error));
  }
}
