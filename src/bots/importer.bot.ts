import { IBApiNext, Contract as IbContract, SecType } from "@stoqey/ib";
import { XMLParser } from "fast-xml-parser";
import { ITradingBot } from ".";
import { MyTradingBotApp } from "..";
import {
  Contract,
  EquityStatement,
  OptionStatement,
  Portfolio,
  Statement,
  StatementStatus,
  StatementTypes,
} from "../models";

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
      return StatementStatus.CLOSE_STATUS;
    case "O;Ex":
    case "C;Ex":
      return StatementStatus.EXERCISED_STATUS;
    default:
      console.error("undefined status:", key);
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
  }
  return description + " " + element.quantity + " " + element.symbol + "@" + element.tradePrice + element.currency;
};

export class ImporterBot extends ITradingBot {
  private token: string;
  private query: string;

  constructor(app: MyTradingBotApp, api: IBApiNext, account?: string) {
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
  protected processSecurityInfoUnderlying(element: any): Promise<Contract | undefined> {
    if (element.underlyingConid) {
      return this.findOrCreateContract(ibUnderlyingContractFromElement(element));
    } else return Promise.resolve(undefined);
  }

  protected processSecurityInfo(element: any): Promise<Contract> {
    // console.log(element.symbol);
    return this.processSecurityInfoUnderlying(element).then((_underlying) => {
      return this.findOrCreateContract(ibContractFromElement(element));
    });
  }

  private processAllSecuritiesInfo(element: any): Promise<void> {
    if (element.SecuritiesInfo.SecurityInfo instanceof Array) {
      return element.SecuritiesInfo.SecurityInfo.reduce(
        (p: Promise<void>, element: any) => p.then(() => this.processSecurityInfo(element)),
        Promise.resolve(),
      );
    } else if (element.SecuritiesInfo.SecurityInfo) {
      return this.processSecurityInfo(element.SecuritiesInfo.SecurityInfo).then(() => {});
    }
    return Promise.resolve();
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
          return EquityStatement.create({
            id: statement.id,
            quantity: element.quantity,
            price: element.price,
            proceeds: element.proceeds,
            fees: element.ibCommission,
            realizedPnL: element.realizedPnL,
            status: transactionStatusFromElement(element),
          });
        } else return EquityStatement.findByPk(statement.id);
      }),
    );
  }

  protected processOptStatement(element: any): Promise<OptionStatement | null> {
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
          return this.processSecurityInfo(element).then((contract) =>
            OptionStatement.create({
              id: statement.id,
              quantity: element.quantity,
              price: element.price,
              proceeds: element.proceeds,
              fees: element.ibCommission,
              realizedPnL: element.realizedPnL,
              status: transactionStatusFromElement(element),
              contract_id: contract?.id,
            }),
          );
        } else {
          return OptionStatement.findByPk(statement.id);
        }
      }),
    );
  }

  protected processStatement(element: any): Promise<void> {
    switch (element.assetCategory) {
      case SecType.STK:
      case SecType.FUT:
        return this.processStockTrade(element).then(() => {});
      case SecType.FOP:
      case SecType.OPT:
        return this.processOptStatement(element).then(() => {});
      default:
        console.error("unsupported assetCategory:", element.assetCategory);
        console.log("processTrade", element);
        throw Error("unsupported assetCategory: " + element.assetCategory);
    }
  }

  private processAllStatements(element: any): Promise<void> {
    if (element.Trades.Trade instanceof Array) {
      return element.Trades.Trade.reduce(
        (p: Promise<void>, element: any) => p.then(() => this.processStatement(element)),
        Promise.resolve(),
      );
    } else if (element.Trades.Trade) {
      return this.processStatement(element.Trades.Trade).then(() => {});
    }
    return Promise.resolve();
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
    const defaults = {
      portfolio_id: this.portfolio.id,
      statementType: StatementTypes.CashStatement,
      date: element.dateTime,
      currency: element.currency,
      amount: element.amount,
      description: element.description,
      transactionId: element.transactionID,
      fxRateToBase: element.fxRateToBase,
      stock_id: undefined,
    };
    // console.log("processCashTransaction", element, defaults);
    return Statement.findOrCreate({
      where: { transactionId: element.transactionID },
      defaults,
      //   logging: console.log,
    }).then(([statement, _created]) => statement);
  }

  private processAllCashTransactions(element: any): Promise<void> {
    if (element.CashTransactions.CashTransaction instanceof Array) {
      return element.CashTransactions.CashTransaction.reduce(
        (p: Promise<void>, element: any) => p.then(() => this.processCashTransaction(element)),
        Promise.resolve(),
      );
    } else if (element.CashTransactions.CashTransaction) {
      return this.processCashTransaction(element.CashTransactions.CashTransaction).then(() => {});
    }
    return Promise.resolve();
  }

  protected processCorporateAction(element: any) {
    console.log("processCorporateAction", element);
  }

  private processAllCorporateActions(element: any) {
    if (element.CorporateActions.CorporateAction instanceof Array) {
      element.CorporateActions.CorporateAction.forEach((element) => this.processCorporateAction(element));
    } else if (element.CorporateActions.CorporateAction) {
      this.processCorporateAction(element.CorporateActions.CorporateAction);
    }
  }

  protected async processReport(element: any): Promise<void> {
    console.log("AccountInformation", element.AccountInformation);
    Portfolio.findOrCreate({
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
      .then(([_portfolio, _created]) => this.processAllSecuritiesInfo(element))
      .then(() => this.processAllStatements(element));
    this.processAllCashTransactions(element);
    this.processAllCorporateActions(element);
  }

  protected fetchReport(url: string): Promise<void> {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
    });
    console.log("fetching report at", url);
    return fetch(url)
      .then((response) => response.text())
      .then((XMLdata) => {
        const jObj = parser.parse(XMLdata);
        if (jObj.FlexQueryResponse) {
          if (jObj.FlexQueryResponse.FlexStatements.FlexStatement instanceof Array) {
            jObj.FlexQueryResponse.FlexStatements.FlexStatement.forEach(async (element) => {
              await this.processReport(element);
            });
          } else {
            this.processReport(jObj.FlexQueryResponse.FlexStatements.FlexStatement);
          }
        } else if (jObj.FlexStatementResponse?.Status == "Warn" && jObj.FlexStatementResponse.ErrorCode == 1019) {
          // Retry
          setTimeout(() => this.fetchReport(url), 1 * 1000);
        } else if (jObj.FlexStatementResponse?.ErrorMessage) {
          throw Error("Can t fetch data" + jObj.FlexStatementResponse.ErrorMessage);
        } else {
          console.log(jObj);
        }
      });
  }

  protected process(): Promise<void> {
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
      });
  }

  public async start(): Promise<void> {
    this.init().then(() => {
      this.on("process", this.process);
      setTimeout(() => this.emit("process"), 10 * 1000); // start after 10 secs
    });
  }
}
