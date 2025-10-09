/* eslint-disable @typescript-eslint/promise-function-async */
import { lazy } from "react";
import { Outlet, createBrowserRouter } from "react-router-dom";
import Layout from "./components/Layout/Layout";
import ErrorPage from "./error-page";

// Lazy load components
const BalanceEdit = lazy(() => import("./components/Portfolio/Balance/BalanceEdit"));
const BalanceShow = lazy(() => import("./components/Portfolio/Balance/BalanceShow"));
const BalancesIndex = lazy(() => import("./components/Portfolio/Balance/BalancesIndex"));
const ContractShow = lazy(() => import("./components/Portfolio/Contract/ContractShow"));
const PortfolioLayout = lazy(() => import("./components/Portfolio/Layout/PortfolioLayout"));
const OrdersIndex = lazy(() => import("./components/Portfolio/Order/OrdersIndex"));
const PortfolioEdit = lazy(() => import("./components/Portfolio/Portfolio/PortfolioEdit"));
const PortfolioShow = lazy(() => import("./components/Portfolio/Portfolio/PortfolioShow"));
const PortfolioIndex = lazy(() => import("./components/Portfolio/PortfolioIndex"));
const OptionsPositions = lazy(() => import("./components/Portfolio/Position/OptionsPositions"));
const PositionEdit = lazy(() => import("./components/Portfolio/Position/PositionEdit"));
const PositionShow = lazy(() => import("./components/Portfolio/Position/PositionShow"));
const PositionsIndex = lazy(() => import("./components/Portfolio/Position/PositionsIndex"));
const ReportDetails = lazy(() => import("./components/Portfolio/Report/ReportDetails"));
const ReportsIndex = lazy(() => import("./components/Portfolio/Report/ReportIndex"));
const ReportLayout = lazy(() => import("./components/Portfolio/Report/ReportLayout"));
const ReportSummary = lazy(() => import("./components/Portfolio/Report/ReportSummary"));
const SettingEdit = lazy(() => import("./components/Portfolio/Setting/SettingEdit"));
const SettingShow = lazy(() => import("./components/Portfolio/Setting/SettingShow"));
const StatementEdit = lazy(() => import("./components/Portfolio/Statement/StatementEdit"));
const StatementShow = lazy(() => import("./components/Portfolio/Statement/StatementShow"));
const StatementSummary = lazy(() => import("./components/Portfolio/Statement/StatementSummary"));
const StatementIndex = lazy(() => import("./components/Portfolio/Statement/StatementsTable"));
const TradesTable = lazy(() => import("./components/Portfolio/Trade/ClosedTradesTable"));
const TradeEdit = lazy(() => import("./components/Portfolio/Trade/TradeEdit"));
const TradeLayout = lazy(() => import("./components/Portfolio/Trade/TradeLayout"));
const TradeShow = lazy(() => import("./components/Portfolio/Trade/TradeShow"));
const TradesOpen = lazy(() => import("./components/Portfolio/Trade/TradesOpen"));
const TradesSummary = lazy(() => import("./components/Portfolio/Trade/TradesSummary"));

// Import loaders and actions
import { balanceDelete, balanceSave } from "./components/Portfolio/Balance/actions";
import { balancesIndexLoader, balancesShowLoader } from "./components/Portfolio/Balance/loaders";
import { contractShowLoader } from "./components/Portfolio/Contract/loaders";
import { action as PortfolioAction } from "./components/Portfolio/Layout/actions";
import { orderDelete } from "./components/Portfolio/Order/actions";
import { ordersIndexLoader } from "./components/Portfolio/Order/loaders";
import { portfolioSave } from "./components/Portfolio/Portfolio/actions";
import { portfolioEditLoader, portfolioLoader } from "./components/Portfolio/Portfolio/loaders";
import {
  positionAddToTrade,
  positionDelete,
  positionGuessTrade,
  positionSave,
  positionUnlinkTrade,
} from "./components/Portfolio/Position/actions";
import {
  positionShowLoader,
  positionsIndexLoader,
  positionsOptionsLoader,
} from "./components/Portfolio/Position/loaders";
import {
  reportSummaryLoader,
  reportsIndexLoader,
  reportsIndexLoader12m,
  reportsIndexLoaderYtd,
} from "./components/Portfolio/Report/loaders";
import { settingDelete, settingSave } from "./components/Portfolio/Setting/actions";
import { settingEditLoader, settingLoader, settingNewLoader } from "./components/Portfolio/Setting/loaders";
import {
  statementAddToTrade,
  statementCreateTrade,
  statementDelete,
  statementGuessTrade,
  statementSave,
  statementUnlinkTrade,
} from "./components/Portfolio/Statement/actions";
import {
  statementMonthLoader,
  statementShowLoader,
  statementSummaryLoader12M,
  statementSummaryLoaderAll,
  statementSummaryLoaderYTD,
} from "./components/Portfolio/Statement/loaders";
import { tradeDelete, tradeSave } from "./components/Portfolio/Trade/actions";
import {
  tradeSummaryLoader12M,
  tradeSummaryLoaderAll,
  tradeSummaryLoaderYTD,
  tradesClosedOpenedLoader,
  tradesMonthLoader,
  tradesOpenLoader,
  tradesShowLoader,
} from "./components/Portfolio/Trade/loaders";
import { portfolioIndexLoader } from "./components/Portfolio/loaders";

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: (
        <Layout>
          <Outlet />
        </Layout>
      ),
      errorElement: <ErrorPage />,
      hydrateFallbackElement: <>Loading...</>,
      children: [
        { index: true, element: <>(Home)</> },
        { path: "/blog", element: <>(Blog)</> },
        {
          path: "/portfolio",
          action: PortfolioAction,
          children: [
            { index: true, element: <PortfolioIndex />, loader: portfolioIndexLoader },
            {
              path: ":portfolioId",
              element: (
                <PortfolioLayout>
                  <Outlet />
                </PortfolioLayout>
              ),
              children: [
                /* Portfolio settings */
                {
                  path: "parameters",
                  children: [
                    { index: true, element: <PortfolioShow />, loader: portfolioLoader },
                    { path: "edit", element: <PortfolioEdit />, loader: portfolioEditLoader, action: portfolioSave },
                    {
                      path: ":settingId",
                      children: [
                        { index: true, element: <SettingShow />, loader: settingLoader },
                        { path: "edit", element: <SettingEdit />, loader: settingEditLoader, action: settingSave },
                        { path: "delete", action: settingDelete },
                      ],
                    },
                    { path: "create", element: <SettingEdit />, loader: settingNewLoader, action: settingSave },
                  ],
                },

                /* Statements */
                {
                  path: "statements",
                  action: PortfolioAction,
                  children: [
                    {
                      path: "summary",
                      action: PortfolioAction,
                      children: [
                        { path: "ytd", element: <StatementSummary />, loader: statementSummaryLoaderYTD },
                        { path: "12m", element: <StatementSummary />, loader: statementSummaryLoader12M },
                        { path: "all", element: <StatementSummary />, loader: statementSummaryLoaderAll },
                      ],
                    },
                    {
                      path: "month/:year/:month",
                      action: PortfolioAction,
                      children: [
                        { index: true, element: <StatementIndex />, loader: statementMonthLoader },
                        { path: "StatementCreateTrade/:statementId", action: statementCreateTrade },
                        { path: "StatementGuessTrade/:statementId", action: statementGuessTrade },
                        { path: "StatementAddToTrade/:statementId/:tradeId", action: statementAddToTrade },
                        { path: "StatementUnlinkTrade/:statementId", action: statementUnlinkTrade },
                        { path: "DeleteStatement/:statementId", action: statementDelete },
                      ],
                    },
                    {
                      path: "id/:statementId",
                      action: PortfolioAction,
                      children: [
                        { index: true, element: <StatementShow />, loader: statementShowLoader },
                        {
                          path: "edit",
                          element: <StatementEdit />,
                          loader: statementShowLoader,
                          action: statementSave,
                        },
                        { path: "CreateTrade", action: statementCreateTrade },
                        { path: "GuessTrade", action: statementGuessTrade },
                        { path: "AddToTrade/:tradeId", action: statementAddToTrade },
                        { path: "UnlinkTrade", action: statementUnlinkTrade },
                        { path: "delete", action: statementDelete },
                      ],
                    },
                  ],
                },

                /* Positions */
                {
                  path: "positions",
                  children: [
                    {
                      path: "all",
                      children: [
                        { index: true, element: <PositionsIndex />, loader: positionsIndexLoader },
                        { path: "DeletePosition/:positionId", action: positionDelete },
                        { path: "PositionGuessTrade/:positionId", action: positionGuessTrade },
                        { path: "PositionAddToTrade/:positionId/:tradeId", action: positionAddToTrade },
                        { path: ":positionId/PositionUnlinkTrade", action: positionUnlinkTrade },
                      ],
                    },
                    {
                      path: "options",
                      children: [
                        { index: true, element: <OptionsPositions />, loader: positionsOptionsLoader },
                        { path: "DeletePosition/:positionId", action: positionDelete },
                      ],
                    },
                    {
                      path: "id/:positionId",
                      children: [
                        { index: true, element: <PositionShow />, loader: positionShowLoader },
                        { path: "edit", element: <PositionEdit />, loader: positionShowLoader, action: positionSave },
                      ],
                    },
                  ],
                },

                /* Orders */
                {
                  path: "orders",
                  children: [
                    { index: true, element: <OrdersIndex />, loader: ordersIndexLoader },
                    { path: "DeleteOrder/:orderId", action: orderDelete },
                  ],
                },

                /* Balances */
                {
                  path: "balances",
                  action: PortfolioAction,
                  children: [
                    { index: true, element: <BalancesIndex />, loader: balancesIndexLoader },
                    { path: "DeleteBalance/:balanceId", action: balanceDelete },
                    {
                      path: "id/:balanceId",
                      children: [
                        { index: true, element: <BalanceShow />, loader: balancesShowLoader },
                        { path: "edit", element: <BalanceEdit />, loader: balancesShowLoader, action: balanceSave },
                      ],
                    },
                  ],
                },

                /* Trades */
                {
                  path: "trades",
                  element: (
                    <TradeLayout>
                      <Outlet />
                    </TradeLayout>
                  ),
                  children: [
                    {
                      path: "summary",
                      action: PortfolioAction,
                      children: [
                        {
                          path: "open",
                          element: <TradesOpen />,
                          loader: tradesOpenLoader,
                          children: [
                            { index: true, element: <TradesOpen />, loader: tradesOpenLoader },
                            { path: ":positionId/PositionUnlinkTrade", action: positionUnlinkTrade },
                          ],
                        },
                        { path: "ytd", element: <TradesSummary />, loader: tradeSummaryLoaderYTD },
                        { path: "12m", element: <TradesSummary />, loader: tradeSummaryLoader12M },
                        { path: "all", element: <TradesSummary />, loader: tradeSummaryLoaderAll },
                      ],
                    },
                    {
                      path: "id/:tradeId",
                      action: PortfolioAction,
                      children: [
                        { index: true, element: <TradeShow />, loader: tradesShowLoader },
                        { path: "edit", element: <TradeEdit />, loader: tradesShowLoader, action: tradeSave },
                        { path: "delete", action: tradeDelete },

                        { path: "StatementCreateTrade/:statementId", action: statementCreateTrade },
                        { path: "StatementGuessTrade/:statementId", action: statementGuessTrade },
                        { path: "StatementAddToTrade/:statementId/:tradeId", action: statementAddToTrade },
                        { path: "StatementUnlinkTrade/:statementId", action: statementUnlinkTrade },
                        { path: "DeleteStatement/:statementId", action: statementDelete },

                        { path: "DeletePosition/:positionId", action: positionDelete },
                        { path: ":positionId/PositionUnlinkTrade", action: positionUnlinkTrade },
                        { path: "PositionGuessTrade/:positionId", action: positionGuessTrade },
                      ],
                    },
                    {
                      path: "month/:year/:month",
                      element: <TradesTable />,
                      loader: tradesMonthLoader,
                    },
                    {
                      path: "closed/:year/:month/opened/:yearfrom/:monthfrom",
                      element: <TradesTable />,
                      loader: tradesClosedOpenedLoader,
                    },
                  ],
                },

                /* Contracts */
                {
                  path: "contracts",
                  action: PortfolioAction,
                  children: [
                    { index: true },
                    {
                      path: "id/:contractId",
                      element: <ContractShow />,
                      loader: contractShowLoader,
                      children: [
                        { path: "PositionGuessTrade/:positionId", action: positionGuessTrade },
                        { path: "PositionAddToTrade/:positionId/:tradeId", action: positionAddToTrade },
                        { path: ":positionId/PositionUnlinkTrade", action: positionUnlinkTrade },

                        { path: "StatementCreateTrade/:statementId", action: statementCreateTrade },
                        { path: "StatementGuessTrade/:statementId", action: statementGuessTrade },
                        { path: "StatementAddToTrade/:statementId/:tradeId", action: statementAddToTrade },
                        { path: "StatementUnlinkTrade/:statementId", action: statementUnlinkTrade },
                        { path: "DeleteStatement/:statementId", action: statementDelete },
                      ],
                    },
                  ],
                },

                /* Tax reports */
                {
                  path: "reports",
                  element: (
                    <ReportLayout>
                      <Outlet />
                    </ReportLayout>
                  ),
                  children: [
                    { path: "index", element: <ReportsIndex />, loader: reportsIndexLoader },
                    { path: "ytd", element: <ReportsIndex />, loader: reportsIndexLoaderYtd },
                    { path: "12m", element: <ReportsIndex />, loader: reportsIndexLoader12m },
                    { path: "year/:year", element: <ReportSummary />, loader: reportSummaryLoader },
                    { path: "year/:year/details", element: <ReportDetails />, loader: reportSummaryLoader },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  {
    future: {},
  },
);

export default router;
