export interface ITradingBot {
    start(): void;
    stop(): void;
}

export { UpdaterBot } from './updater.bot';
export { AccountBot } from './account.bot';
