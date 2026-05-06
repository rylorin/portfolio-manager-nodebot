import { CronJob, JobResult } from "./cronJob";

export type JobStatus = { name: string; isRunning: boolean; lastExecution: Date | null; isScheduled: boolean };

export class JobManager {
  private jobs: Record<string, CronJob> = {};

  public addJob(job: CronJob): void {
    this.jobs[job.name] = job;
  }

  public async startAll(): Promise<void> {
    console.log("🚀 Starting all background jobs...");

    await Object.values(this.jobs).reduce(
      async (p, job) =>
        p.then(async () => {
          console.log(`▶️ Starting job: ${job.constructor.name}`);
          return job.start();
        }),
      Promise.resolve(),
    );

    console.log("✅ All background jobs started");
  }

  public async stopAll(): Promise<void> {
    console.log("⏹️ Stopping all background jobs...");

    await Object.values(this.jobs).reduce(
      async (p, job) =>
        p.then(async () => {
          return job.stop();
        }),
      Promise.resolve(),
    );

    console.log("✅ All background jobs stopped");
  }

  public async runJobOnce(jobName: keyof typeof this.jobs): Promise<JobResult> {
    const job = this.jobs[jobName];
    if (!job) {
      throw new Error(`Job ${jobName} not found`);
    }

    return await job.execute();
  }

  public getJobStatus(jobName: keyof typeof this.jobs): JobStatus {
    const job = this.jobs[jobName];
    if (!job) {
      return null;
    }

    return job.getStatus();
  }

  public getAllJobStatuses(): Record<string, JobStatus> {
    const statuses: Record<string, any> = {};

    Object.keys(this.jobs).forEach((jobName) => {
      const job = this.jobs[jobName as keyof typeof this.jobs];
      const status = job.getStatus();
      statuses[jobName] = status;
    });

    return statuses;
  }

  public getHealthCheck(): {
    overall: "healthy" | "warning" | "unhealthy";
    jobs: Record<string, any>;
    summary: {
      total: number;
      running: number;
      stopped: number;
      errors: number;
    };
  } {
    const statuses = this.getAllJobStatuses();

    let running = 0;
    let stopped = 0;
    let errors = 0;

    Object.values(statuses).forEach((status: JobStatus) => {
      if (status.isScheduled || status.isRunning) {
        running++;
      } else {
        stopped++;
      }

      // Consider a job in error state if it hasn't run in the last 10 minutes
      const now = new Date();
      const lastExecution = status.lastExecution ? new Date(status.lastExecution) : null;
      const minutesSinceLastExecution = lastExecution
        ? Math.floor((now.getTime() - lastExecution.getTime()) / 60_000)
        : Infinity;

      if (status.isScheduled && minutesSinceLastExecution > 15) {
        errors++;
      }
    });

    const total = Object.keys(statuses).length;
    let overall: "healthy" | "warning" | "unhealthy" = "healthy";

    if (errors > 0) {
      overall = "unhealthy";
    } else if (stopped > 0) {
      overall = "warning";
    }

    return {
      overall,
      jobs: statuses,
      summary: {
        total,
        running,
        stopped,
        errors,
      },
    };
  }

  public destroy(): void {
    console.log("🔥 Destroying all background jobs...");

    Object.values(this.jobs).forEach((job) => {
      job.destroy().catch((reason: any) => console.error(reason));
    });

    console.log("✅ All background jobs destroyed");
  }
}

export const jobManager = new JobManager();

const signalHandler = (signal: NodeJS.Signals): void => {
  console.log(`\n🛑 ${signal} received, shutting down gracefully...`);
  jobManager
    .stopAll()
    .then(() => process.exit())
    .catch((reason: any) => console.error(reason));
};

// Graceful shutdown handling
process.on("SIGINT", signalHandler);

process.on("SIGTERM", signalHandler);
