/**
 * My IB trading bot implementation.
 */

import path from "path";
import logger from "@stoqey/ib/dist/common/logger";
import { IBApiNextApp } from "@stoqey/ib/dist/tools/common/ib-api-next-app";
import { initDB } from "./models";
import {
  ContractsUpdaterBot,
  AccountUpdateBot,
  CashManagementBot,
  RollOptionPositionsBot,
  SellCashSecuredPutBot,
  SellCoveredCallsBot,
  YahooUpdateBot,
  OptionsCreateBot,
} from "./bots";

/////////////////////////////////////////////////////////////////////////////////
// The help text                                                               //
/////////////////////////////////////////////////////////////////////////////////

const DESCRIPTION_TEXT = "Print real time market data of a given contract id.";
const USAGE_TEXT = "Usage: market-data.js <options>";
const OPTION_ARGUMENTS: [string, string][] = [
  ["clientId=<number>", "Client id of current IB connection. Default is random"],
  ["portfolio=<string>", "IB account number"],
  ["updater", "start option contracts updater bot"],
  ["yahoo", "start Yahoo Finance updater"],
  ["account", "start account info update bot"],
  ["cash", "start cash management bot"],
  ["cc", "start covered calls bot"],
  ["csp", "start cash secured puts bot"],
  ["roll", "start roll positions bot"],
  ["options", "start create options contracts bot"],
];
const EXAMPLE_TEXT =
  path.basename(__filename) + path.basename(__filename) + "-port=7497 -host=localhost ";

//////////////////////////////////////////////////////////////////////////////
// The App code                                                             //
//////////////////////////////////////////////////////////////////////////////

class MyTradingBotApp extends IBApiNextApp {

  constructor() {
    super(DESCRIPTION_TEXT, USAGE_TEXT, OPTION_ARGUMENTS, EXAMPLE_TEXT);
  }

  /**
    * Start the app.
    */
  public start(): void {
    const scriptName = path.basename(__filename);
    logger.debug(`Starting ${scriptName} script`);
    const clientId: number = (this.cmdLineArgs.clientId != undefined) ? +this.cmdLineArgs.clientId : Math.round(Math.random() * 16383);
    // console.log("clientId", clientId);
    this.connect(
      this.cmdLineArgs.watch ? 10000 : 0,
      clientId
    );
    // this.api.setMarketDataType(MarketDataType.DELAYED_FROZEN);  // Error 354 on JPY and CHF
    // this.api.setMarketDataType(MarketDataType.REALTIME);        // Error 354 on JPY and CHF
    initDB().then(() => {
      const portfolio: string = this.cmdLineArgs.portfolio ? this.cmdLineArgs.portfolio as string : process.env.IB_ACCOUNT;
      // console.log(this.cmdLineArgs.portfolio as string, process.env.IB_ACCOUNT, portfolio)
      if (this.cmdLineArgs.updater) (new ContractsUpdaterBot(this, this.api)).start();
      if (this.cmdLineArgs.account) (new AccountUpdateBot(this, this.api, portfolio)).start();
      if (this.cmdLineArgs.cash) (new CashManagementBot(this, this.api, portfolio)).start();
      if (this.cmdLineArgs.cc) (new SellCoveredCallsBot(this, this.api, portfolio)).start();
      if (this.cmdLineArgs.csp) (new SellCashSecuredPutBot(this, this.api, portfolio)).start();
      if (this.cmdLineArgs.roll) (new RollOptionPositionsBot(this, this.api, portfolio)).start();
      if (this.cmdLineArgs.yahoo) (new YahooUpdateBot(this, this.api, portfolio)).start();
      if (this.cmdLineArgs.options) (new OptionsCreateBot(this, this.api, portfolio)).start();
    });
  }

  /**
    * Stop the app with success code.
    */
  public stop(): void {
    this.exit();
  }

}

// run the app
new MyTradingBotApp().start();