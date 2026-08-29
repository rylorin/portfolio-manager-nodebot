# AGENTS.md

## Project Overview

Interactive Brokers trading bot ("wheel"/thetagang strategy).
Node.js backend manages the IB TWS/Gateway connection, runs scheduled option-selling
strategies (covered calls, cash-secured puts, rolls) and persists data in SQLite.
React SPA frontend for portfolio management.

⚠️ This bot can place REAL orders on Interactive Brokers. Never run trading jobs
(`-trader`, `-cc`, `-csp`, `-roll`) without understanding the strategy code first.
Default market data type is DELAYED_FROZEN.

## Commands

- `yarn install --frozen-lockfile` # install (yarn only, Node ^22.21.1)
- `yarn dev` # dev server + client concurrently
- `yarn qc` # QUALITY GATE: prettier + stylelint + eslint + tsc --noEmit — MUST pass before finishing any change
- `yarn lint` # eslint ./src
- `yarn build` # tsc (server) + vite build (client) into dist/
- `yarn start` # production: node dist/index.js -server -watch
- No unit test framework exists; do not invent one unless asked. Verify with `yarn qc` + `yarn build`.

## Architecture (`src/`)

- `index.ts` entry point (CLI flags via IBApiNextApp): `-server -account -yahoo -import -watch -update -accountId=...`
- `server.ts` Express app: serves `/api` routers + static `dist/app` (port 3001, `PORT` env)
- `bots/` `ITradingBot` base class (IB contract sync, price updates), `TradeBot` (strategy engine), `AccountUpdateBot`, `YahooUpdateBot`, `importer.bot.ts` (Flex XML statements import)
- `jobs/` `JobManager` + abstract `CronJob` (node-cron). Jobs: optionChain, pricesUpdate, cashStrategy, rollStrategies, coveredCallsStrategies, cashSecuredPutsStrategies, reportLoader
- `models/` Sequelize-typescript models (`*.model.ts`) + types (`*.types.ts`). Contract uses inheritance by secType (StockContract, OptionContract...). Models are registered in `index.ts` `start()`; the custom `modelMatch` convention is required.
- `routers/` Express API under `/api/portfolio` and `/api/repository` (`*.router.ts` + `*.types.ts` + `*.utils.ts`)
- `app/` React 19 + Vite SPA. `routes.tsx` declares all routes with react-router v7 loaders/actions colocated per component folder (`loaders.ts` fetches `/api/...`, `actions.ts` POSTs form data). Chakra UI v3.
- `black_scholes.ts` option greeks / implied volatility math

## Code Conventions

- TypeScript strict but `strictNullChecks: false` and `noImplicitAny: false` (transitional); don't "fix" globally
- ESLint flat config enforces: explicit return types on exported functions, async promise functions, no-floating-promises, no-misused-promises. Unused params prefixed `_`
- Prettier: 120 cols, double quotes, semicolons, trailing commas. Verified through `yarn qc`
- File naming: snake_case with dots (`portfolio.model.ts`). Comments are often French — keep existing style per file
- DB path: `db/var/db/data.db` (SQLite, `sequelize.sync` with `alter:false` — schema changes need a manual migration or sync flag)
- Path alias `@/*` → `src/*`
- Logging: use `logger` from `src/logger.ts` (winston CSV in `logs/`), NOT console except inside jobs
- Prices: GBP contracts are stored in pence (÷100 on write)

## Environment

- Copy `sample.env` → `.env`. Key vars: `IB_ACCOUNT`, `IB_PORT` (4002 paper gateway), `LOG_LEVEL`, `TRADING_MODE`
- Vite dev proxies `/api` → `localhost:3001`

## Gotchas

- `patches/` applied via patch-package (@chakra-ui/theme) — keep patch-package in the install flow
- Husky pre-commit runs lint-staged (eslint + prettier + stylelint on staged files)
- CI: `.github/workflows/build.yml` (`yarn build`) and `.github/workflows/check.yml` (`yarn qc`) must stay green
