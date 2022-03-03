/**
 * My IB trading bot implementation.
 */

import path from "path";
import logger from "@stoqey/ib/dist/common/logger";
import { IBApiNextApp } from "@stoqey/ib/dist/tools/common/ib-api-next-app";
import { MarketDataType } from "@stoqey/ib";
import { initDB } from "./models";
import { UpdaterBot } from "./bots";

/////////////////////////////////////////////////////////////////////////////////
// The help text                                                               //
/////////////////////////////////////////////////////////////////////////////////
 
const DESCRIPTION_TEXT = "Print real time market data of a given contract id.";
const USAGE_TEXT = "Usage: market-data.js <options>";
const OPTION_ARGUMENTS: [string, string][] = [
    ["conid=<number>", "Contract ID (conId) of the contract."],
    ["symbol=<name>", "The symbol name."],
    [
        "sectype=<type>",
        "The security type. Valid values: STK, OPT, FUT, IND, FOP, CFD, CASH, BAG, BOND, CMDTY, NEWS and FUND",
    ],
    ["exchange=<name>", "The destination exchange name."],
    ["currency=<currency>", "The contract currency."],
];
const EXAMPLE_TEXT =
  path.basename(__filename) + "market-data-single.js -symbol=AAPL -conid=265598 -sectype=STK -exchange=SMART";
 
//////////////////////////////////////////////////////////////////////////////
// The App code                                                             //
//////////////////////////////////////////////////////////////////////////////
 
class MyTradingBotApp extends IBApiNextApp {

    constructor() {
        super(DESCRIPTION_TEXT, USAGE_TEXT, OPTION_ARGUMENTS, EXAMPLE_TEXT);
        // this.boostrap();
      };

    /**
      * Start the app.
      */
    public start(): void {
      const scriptName = path.basename(__filename);
      logger.debug(`Starting ${scriptName} script`);
      this.connect();
      this.api.setMarketDataType(MarketDataType.REALTIME);
      initDB().then(() => {
        (new UpdaterBot(this, this.api)).start();
      });
    };
    
    /**
      * Stop the app with success code.
      */
    public stop(): void {
        this.exit();
    };

    // public async boostrap() {
    //   // Connect to db
    //   await initDB();
    // };

};

// run the app
new MyTradingBotApp().start();
// const truc = new MyTradingBotApp()
// truc.boostrap().then(() => {
//   truc.start()
// })