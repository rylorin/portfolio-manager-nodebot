/**
 * My IB trading bot implementation.
 */

import path from "path";
import logger from "@stoqey/ib/dist/common/logger";
import { IBApiNextApp } from "@stoqey/ib/dist/tools/common/ib-api-next-app";
import { MarketDataType } from "@stoqey/ib";
import { initDB } from "./models";
import { UpdaterBot, AccountBot } from "./bots";

/////////////////////////////////////////////////////////////////////////////////
// The help text                                                               //
/////////////////////////////////////////////////////////////////////////////////
 
const DESCRIPTION_TEXT = "Print real time market data of a given contract id.";
const USAGE_TEXT = "Usage: market-data.js <options>";
const OPTION_ARGUMENTS: [string, string][] = [
  ["clientId=<number>", "Client id of current IB connection. Default is 0"],
  [ 'updater', 'start updater bot' ],
  [ 'account', 'start account bot' ],
];
const EXAMPLE_TEXT =
  path.basename(__filename) + "market-data-single.js -port=7497 -host=localhost ";
 
//////////////////////////////////////////////////////////////////////////////
// The App code                                                             //
//////////////////////////////////////////////////////////////////////////////
 
class MyTradingBotApp extends IBApiNextApp {

    constructor() {
        super(DESCRIPTION_TEXT, USAGE_TEXT, OPTION_ARGUMENTS, EXAMPLE_TEXT);
      };

    /**
      * Start the app.
      */
    public start(): void {
      const scriptName = path.basename(__filename);
      logger.debug(`Starting ${scriptName} script`);
      this.connect(
        this.cmdLineArgs.watch ? 10000 : 0,
        +this.cmdLineArgs.clientId ?? 0
      );
      this.api.setMarketDataType(MarketDataType.REALTIME);
      this.api.setMarketDataType(MarketDataType.FROZEN);
      initDB().then(() => {
        if (this.cmdLineArgs.updater) (new UpdaterBot(this, this.api)).start();
        if (this.cmdLineArgs.account) (new AccountBot(this, this.api)).start();
      });
    };
    
    /**
      * Stop the app with success code.
      */
    public stop(): void {
        this.exit();
    };

};

// run the app
new MyTradingBotApp().start();