/**
 * My IB trading bot implementation.
 */

import path from "path";
import logger from "@stoqey/ib/dist/common/logger";
import { IBApiNextApp } from "@stoqey/ib/dist/tools/common/ib-api-next-app";
import { Sequelize, SequelizeOptions } from "sequelize-typescript";
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
import { LogLevel } from "@stoqey/ib";

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

export class MyTradingBotApp extends IBApiNextApp {

  public sequelize: Sequelize;

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
    this.connect(
      this.cmdLineArgs.watch ? 10000 : 0,
      clientId
    );
    const sequelize_settings: SequelizeOptions = {
      dialect: "sqlite",
      storage: __dirname + "/../../db/var/db/data.db",
      models: [__dirname + "/models/*.model.js"], // or [Player, Team],
      modelMatch: (filename, member) => {
        return filename.substring(0, filename.indexOf(".model")) === member.toLowerCase();
      },
      sync: { alter: false },
      // isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
      // transactionType: Transaction.TYPES.EXCLUSIVE,
    };
    if (this.api.logLevel < LogLevel.DETAIL) sequelize_settings.logging = false;
    // this.api.setMarketDataType(MarketDataType.DELAYED_FROZEN);  // Error 354 on JPY and CHF
    // this.api.setMarketDataType(MarketDataType.REALTIME);        // Error 354 on JPY and CHF
    this.sequelize = new Sequelize(sequelize_settings);
    this.sequelize.authenticate()
      .then(() => this.sequelize.sync()).then(() => {
        const portfolio: string = this.cmdLineArgs.portfolio ? this.cmdLineArgs.portfolio as string : process.env.IB_ACCOUNT;
        const yahooBot: YahooUpdateBot = new YahooUpdateBot(this, this.api, portfolio);
        if (this.cmdLineArgs.updater) (new ContractsUpdaterBot(this, this.api, yahooBot)).start();
        if (this.cmdLineArgs.account) (new AccountUpdateBot(this, this.api, portfolio)).start();
        if (this.cmdLineArgs.cash) (new CashManagementBot(this, this.api, portfolio)).start();
        if (this.cmdLineArgs.cc) (new SellCoveredCallsBot(this, this.api, portfolio)).start();
        if (this.cmdLineArgs.csp) (new SellCashSecuredPutBot(this, this.api, portfolio)).start();
        if (this.cmdLineArgs.roll) (new RollOptionPositionsBot(this, this.api, portfolio)).start();
        if (this.cmdLineArgs.yahoo) yahooBot.start();
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