/**
 * Logging facility
 * @author Guerrilla Team
 */
import { exit } from "process";
import winston, { Logger as WinstonLogger, createLogger, format, transports } from "winston";

require("dotenv").config(); // eslint-disable-line @typescript-eslint/no-var-requires

export const LogLevel = {
  Fatal: 0,
  Error: 1,
  Warning: 2,
  Info: 3,
  Debug: 4,
  Trace: 5,
} as const;
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

const level = (parseInt(process.env.LOG_LEVEL ) as LogLevel) || LogLevel.Info; // Default to info
const log_modules: string[] = ((process.env.LOG_MODULES ) || "").split(",");
const log_console: string[] = ((process.env.LOG_CONSOLE ) || "").split(",");

/**
 * Logger facility class
 */
class Logger {
  private loggers: Record<string, WinstonLogger> = {};

  constructor() {
    // this.log_debug_console = (process.env.LOG_DEBUG_CONSOLE as string) == 'true';
    // const logFilePath = join(app.getPath('logs'), logFile ?? 'backend_log.csv');

    // create default logger
    this.loggers["default"] = this.createLogger("backend_log");
    // create other loggers
    log_modules.forEach((item) => {
      this.loggers[item] = this.createLogger(item);
    });
  }

  private createLogger(module: string): winston.Logger {
    const to_console: boolean = log_console.findIndex((item) => item == module) >= 0;
    return createLogger({
      transports: [
        new transports.File({
          dirname: "logs",
          filename: module + ".csv",
          level: Logger.level2string(level),
          tailable: true,
          format: format.combine(
            format.timestamp(),
            format.printf(({ timestamp, level, message, service, asset }) => {
              return `${timestamp};${level};${service};${asset};${message}`;
            }),
          ),
          maxsize: 2 * 1024 * 1024, // 2Mb
          maxFiles: 5,
        }),
        new transports.Console({
          level: to_console ? "silly" : "info",
          format: format.combine(
            format.colorize(),
            format.timestamp(),
            format.printf(({ timestamp, level, message, service, asset }) => {
              const service_text = service ? ` [${service}]` : "";
              const asset_text = asset ? ` (${asset})` : "";
              return `[${timestamp}] ${level}${service_text}${asset_text} ${message}`;
            }),
          ),
        }),
      ],
      // exceptionHandlers: [
      //   new transports.Console(),
      //   new transports.File({ dirname: app.getPath('logs'), filename: 'exceptions.log' }),
      // ],
      // rejectionHandlers: [
      //   new transports.Console(),
      //   new transports.File({ dirname: app.getPath('logs'), filename: 'rejections.log' }),
      // ],
      exitOnError: false,
    });
  }

  private static level2string(level: LogLevel): string {
    let result: string;
    switch (level) {
      case LogLevel.Fatal:
        result = "error";
        break;
      case LogLevel.Error:
        result = "error";
        break;
      case LogLevel.Warning:
        result = "warn";
        break;
      case LogLevel.Info:
        result = "info";
        break;
      case LogLevel.Debug:
        result = "debug";
        break;
      case LogLevel.Trace:
        result = "silly";
        break;
      default:
        result = "undefined";
    }
    return result;
  }

  // Apply some color styles
  // private static bold(s: string): string {
  //   return '\u001b[' + bold[0] + 'm' + s + '\u001b[' + bold[1] + 'm';
  // }
  // private static red(s: string): string {
  //   return '\u001b[' + brightRed[0] + 'm' + s + '\u001b[' + brightRed[1] + 'm';
  // }
  // private static yellow(s: string): string {
  //   return '\u001b[' + brightYellow[0] + 'm' + s + '\u001b[' + brightYellow[1] + 'm';
  // }
  // private static blue(s: string): string {
  //   return '\u001b[' + brightBlue[0] + 'm' + s + '\u001b[' + brightBlue[1] + 'm';
  // }

  /**
   * Log one line
   * @param level level of message
   * @param module module issuing message
   * @param asset asset related to message
   * @param args message (strings) to log
   */
  public log(level: LogLevel, module: string, asset?: string | undefined, ...args: any[]): void {
    let mainmodule: string;
    let submodule: string;
    const [s0, s1] = module.split(".");
    if (s1) {
      mainmodule = s0;
      submodule = s1;
    } else {
      mainmodule = "default";
      submodule = s0;
    }
    const message: string = args
      .map((value) => {
        if (value === undefined) return "undefined";
        else if (value === null) return "null";
        else if (typeof value === "string") return value.replaceAll("\n", "\\n");
        else if (typeof value === "number") return String(value);
        else return JSON.stringify(value);
      })
      .join(", ");
    if (this.loggers[mainmodule])
      this.loggers[mainmodule].log({ level: Logger.level2string(level), message, service: submodule, asset });
    this.loggers["default"].log({ level: Logger.level2string(level), message, service: module, asset });
    if (level === LogLevel.Fatal) exit(-1);
  }

  /**
   * Display an error notification (and log it)
   * @param title title of the notification
   * @param description content of the notification
   * @param id an id for this notification to prevent duplicates
   */
  public error(title: string, description: string): void {
    this.log(LogLevel.Error, title, undefined, description);
  }

  /**
   * Display a warning notification (and log it)
   * @param title title of the notification
   * @param description content of the notification
   * @param id an id for this notification to prevent duplicates
   */
  public warn(title: string, description: string): void {
    this.log(LogLevel.Warning, title, undefined, description);
  }

  /**
   * Display an info notification (and log it)
   * @param title title of the notification
   * @param description content of the notification
   * @param id an id for this notification to prevent duplicates
   */
  public info(title: string, description: string): void {
    this.log(LogLevel.Info, title, undefined, description);
  }

  public debug(...args: any[]): void {
    this.log(LogLevel.Debug, "title", undefined, ...args);
  }
}

/** singleton instance of Logger */
const logger = new Logger();
export default logger;
