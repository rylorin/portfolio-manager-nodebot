import { ImporterBot } from "@/bots/importer.bot";
import { IBApiNext } from "@stoqey/ib";
import { jobManager } from ".";
import { MyTradingBotApp } from "..";
import { CronJob, JobResult } from "./cronJob";

export class ReportLoaderJob extends CronJob {
  task: ImporterBot;

  constructor(app: MyTradingBotApp, api: IBApiNext, account: string) {
    super("*/20 * * * *");
    this.name = this.constructor.name;
    this.task = new ImporterBot(app, api, account);
  }

  public async process(): Promise<JobResult> {
    const startTime = Date.now();
    let success = false;

    // Déléguer à DeltaNeutralTradingService
    await this.task
      .process()
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
      message: success ? "ReportLoader job completed" : "ReportLoader job failed",
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
