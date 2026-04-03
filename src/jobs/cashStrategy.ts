import { TradeBot } from "@/bots/trader.bot";
import { IBApiNext } from "@stoqey/ib";
import { jobManager } from ".";
import { MyTradingBotApp } from "..";
import { CronJob, JobResult } from "./cronJob";

export class CashStrategyJob extends CronJob {
  task: TradeBot;

  constructor(app: MyTradingBotApp, api: IBApiNext, account: string) {
    super("30 * * * *");
    this.name = this.constructor.name;
    this.task = new TradeBot(app, api, account);
  }

  public async process(): Promise<JobResult> {
    const startTime = Date.now();
    let success = false;

    // Déléguer à DeltaNeutralTradingService
    await this.task.portfolio
      // Reload settings
      .reload()
      .then(async (_portfolio) =>
        this.task.portfolio.settings.reduce(
          async (p, setting) => p.then(async () => setting.reload().then()),
          Promise.resolve(),
        ),
      )
      .then(async () => this.task.runCashStrategy())
      .then(() => {
        success = true;
      })
      .catch((error) => {
        console.error(error);
        success = false;
      });

    // Mettre à jour la dernière exécution
    this.lastExecution = new Date();

    const result: JobResult = {
      success,
      message: success ? "CashStrategy job completed" : "CashStrategy job failed",
      executionTime: Date.now() - startTime,
    };
    return result;
  }

  public async runOnce(): Promise<JobResult> {
    const now = Date.now();
    const systemStatus = await jobManager.getHealthCheck();
    if (systemStatus.overall !== "healthy") {
      console.warn("⚠️ System is not healthy, skipping autoCloser job");
      return {
        success: false,
        message: "System is not healthy",
        executionTime: Date.now() - now,
      };
    }
    console.log(`▶️ Running task: ${this.constructor.name}`);
    return this.process();
  }

  public async start(): Promise<void> {
    await this.task.init();
    return super.start();
  }
}
