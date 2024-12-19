import { ITradingBot } from ".";
import { processCashManagement } from "./cash";

export class CashManagementBot extends ITradingBot {
  private async process(): Promise<void> {
    console.log("CashManagementBot process begin");
    await this.init(); // load parameters
    await processCashManagement(this);
    setTimeout(() => this.emit("process"), 3600 * 1000); // wait 1 hour
    console.log("CashManagementBot process end");
  }

  public processWrapper(): void {
    this.process().catch((error) => console.error(error));
  }

  public start(): void {
    this.on("process", () => this.processWrapper());
    setTimeout(() => this.emit("process"), 60 * 1000); // start after 60 secs
  }
}
