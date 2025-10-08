/**
 * My IB trading bot implementation.
 */

import { LogLevel, MarketDataType } from "@stoqey/ib";
import { IBApiNextApp } from "@stoqey/ib/dist/tools/common/ib-api-next-app";
import path from "path";
import { Sequelize, SequelizeOptions } from "sequelize-typescript";
import { AccountUpdateBot, YahooUpdateBot } from "./bots";
import { ImporterBot } from "./bots/importer.bot";
import { TradeBot } from "./bots/trader.bot";
import logger from "./logger";
import {
  BagContract,
  Balance,
  BondContract,
  BondStatement,
  CashContract,
  Contract,
  CorporateStatement,
  Currency,
  DividendStatement,
  EquityStatement,
  FeeStatement,
  FutureContract,
  Index,
  InterestStatement,
  OpenOrder,
  OptionContract,
  OptionStatement,
  Portfolio,
  Position,
  SalesTaxes,
  Setting,
  Statement,
  StockContract,
  TaxStatement,
  Trade,
} from "./models";
import StartServer from "./server";

// Global error handlers for better error handling
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception", { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at", promise, "reason:", reason);
  process.exit(1);
});

/////////////////////////////////////////////////////////////////////////////////
// The help text                                                               //
/////////////////////////////////////////////////////////////////////////////////

const DESCRIPTION_TEXT = "Thetagang IB trading bot.";
const USAGE_TEXT = "Usage: index.js <options>";
const OPTION_ARGUMENTS: [string, string][] = [
  ["accountId=<string>", "IB account number"],
  ["update", "start option contracts updater bot"],
  ["yahoo", "start Yahoo Finance updater"],
  ["account", "start account info update bot"],
  ["import", "import flex statements"],
  ["server", "start React + API server"],
  // The following options may open/close orders
  ["trader", "start trading bot"],
  ["cc", "start covered calls bot"],
  ["csp", "start cash secured puts bot"],
  ["roll", "start roll positions bot"],
];
const EXAMPLE_TEXT = path.basename(__filename) + path.basename(__filename) + "-port=7497 -host=localhost ";

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
    super.start();
    this.connect();
    const sequelize_settings: SequelizeOptions = {
      dialect: "sqlite",
      storage: __dirname + "/../../db/var/db/data.db",
      models: [
        BagContract,
        Balance,
        CashContract,
        Contract,
        Currency,
        FutureContract,
        Index,
        OpenOrder,
        OptionContract,
        Portfolio,
        Position,
        StockContract,
        Trade,
        Statement,
        EquityStatement,
        OptionStatement,
        TaxStatement,
        DividendStatement,
        InterestStatement,
        FeeStatement,
        Setting,
        BondContract,
        BondStatement,
        CorporateStatement,
        SalesTaxes,
      ],
      modelMatch: (filename, member) => {
        return filename.substring(0, filename.indexOf(".model")) === member.toLowerCase();
      },
      sync: { alter: false, force: false },
      // isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
      // transactionType: Transaction.TYPES.EXCLUSIVE,
    };
    if (this.api.logLevel < LogLevel.DETAIL) sequelize_settings.logging = false;
    this.api.setMarketDataType(MarketDataType.DELAYED_FROZEN);
    this.sequelize = new Sequelize(sequelize_settings);
    this.sequelize
      .authenticate()
      .then(async () => this.sequelize.sync())
      .then(() => {
        let accountId: string;
        if (this.cmdLineArgs.accountId) accountId = this.cmdLineArgs.accountId as string;
        else if (process.env.IB_ACCOUNT) accountId = process.env.IB_ACCOUNT;
        else throw Error("Please define accountId");

        if (this.cmdLineArgs.server) {
          StartServer();
        }

        if (this.cmdLineArgs.import) new ImporterBot(this, this.api, accountId).start();
        const yahooBot: YahooUpdateBot = new YahooUpdateBot(this, this.api, accountId);
        if (this.cmdLineArgs.account)
          new AccountUpdateBot(this, this.api, accountId)
            .start()
            .then(() => {
              if (this.cmdLineArgs.trader) new TradeBot(this, this.api, accountId).start();
            })
            .catch((error: Error) => this.error(error.message));
        if (this.cmdLineArgs.yahoo) yahooBot.start();
      })
      .catch((err) => {
        logger.error("Database initialization or bot startup failed", { error: err.message, stack: err.stack });
        process.exit(1); // Exit on critical failure
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
