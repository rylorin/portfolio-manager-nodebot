import { ITradingBot } from ".";
import logger from "../logger";
import { processCashManagement } from "./cash";

const MODULE = "TradeBot";

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unused-vars
const sequelize_logging = (...args: any[]): void => logger.trace(MODULE + ".squelize", ...args);

export class TradeBot extends ITradingBot {
  timer: NodeJS.Timeout;

  public async run(): Promise<void> {
    logger.info(MODULE + ".run", "Trader bot running");
    if (this.portfolio) {
      await this.portfolio.settings
        .sort((a, b) => b.navRatio - a.navRatio)
        .reduce(
          async (p, _item) =>
            p.then(() => {
              //   console.log(item.underlying.symbol);
              //   this.printObject(item);
            }),
          Promise.resolve(),
        )
        .then(async () => processCashManagement(this));
    } else {
      logger.warn(MODULE + ".run", "Portfolio undefined");
    }
  }

  public start(): void {
    logger.info(MODULE + ".start", "Trader bot starting");
    this.init()
      .then(() => {
        this.timer = setInterval(() => {
          this.run().catch((error: Error) => this.error(error.message));
        }, 20_000);
      })
      .catch((error: Error) => this.error(error.message));
  }

  public stop(): void {
    clearInterval(this.timer);
  }
}
