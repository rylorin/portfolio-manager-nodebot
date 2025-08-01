import React from "react";
import { createRoot } from "react-dom/client";
import { Outlet, RouterProvider, createBrowserRouter } from "react-router-dom";
import Layout from "./components/Layout/Layout";
import BalanceEdit from "./components/Portfolio/Balance/BalanceEdit";
import BalanceShow from "./components/Portfolio/Balance/BalanceShow";
import BalancesIndex from "./components/Portfolio/Balance/BalancesIndex";
import { balanceDelete, balanceSave } from "./components/Portfolio/Balance/actions";
import { balancesIndexLoader, balancesShowLoader } from "./components/Portfolio/Balance/loaders";
import ContractShow from "./components/Portfolio/Contract/ContractShow";
import { contractShowLoader } from "./components/Portfolio/Contract/loaders";
import PortfolioLayout from "./components/Portfolio/Layout/PortfolioLayout";
import { action as PortfolioAction } from "./components/Portfolio/Layout/actions";
import OrdersIndex from "./components/Portfolio/Order/OrdersIndex";
import { orderDelete } from "./components/Portfolio/Order/actions";
import { ordersIndexLoader } from "./components/Portfolio/Order/loaders";
import PortfolioEdit from "./components/Portfolio/Portfolio/PortfolioEdit";
import PortfolioShow from "./components/Portfolio/Portfolio/PortfolioShow";
import { portfolioSave } from "./components/Portfolio/Portfolio/actions";
import { portfolioEditLoader, portfolioLoader } from "./components/Portfolio/Portfolio/loaders";
import PortfolioIndex from "./components/Portfolio/PortfolioIndex";
import OptionsPositions from "./components/Portfolio/Position/OptionsPositions";
import PositionEdit from "./components/Portfolio/Position/PositionEdit";
import PositionShow from "./components/Portfolio/Position/PositionShow";
import PositionsIndex from "./components/Portfolio/Position/PositionsIndex";
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
import ReportDetails from "./components/Portfolio/Report/ReportDetails";
import ReportsIndex from "./components/Portfolio/Report/ReportIndex";
import ReportLayout from "./components/Portfolio/Report/ReportLayout";
import ReportSummary from "./components/Portfolio/Report/ReportSummary";
import {
  reportSummaryLoader,
  reportsIndexLoader,
  reportsIndexLoader12m,
  reportsIndexLoaderYtd,
} from "./components/Portfolio/Report/loaders";
import SettingEdit from "./components/Portfolio/Setting/SettingEdit";
import SettingShow from "./components/Portfolio/Setting/SettingShow";
import { settingDelete, settingSave } from "./components/Portfolio/Setting/actions";
import { settingEditLoader, settingLoader, settingNewLoader } from "./components/Portfolio/Setting/loaders";
import StatementEdit from "./components/Portfolio/Statement/StatementEdit";
import StatementShow from "./components/Portfolio/Statement/StatementShow";
import StatementSummary from "./components/Portfolio/Statement/StatementSummary";
import StatementIndex from "./components/Portfolio/Statement/StatementsTable";
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
import TradesTable from "./components/Portfolio/Trade/ClosedTradesTable";
import TradeEdit from "./components/Portfolio/Trade/TradeEdit";
import TradeLayout from "./components/Portfolio/Trade/TradeLayout";
import TradeShow from "./components/Portfolio/Trade/TradeShow";
import TradesOpen from "./components/Portfolio/Trade/TradesOpen";
import TradesSummary from "./components/Portfolio/Trade/TradesSummary";
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
import { Provider } from "./components/ui/provider";
import ErrorPage from "./error-page";
import "./globals.css";

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

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider>
      <RouterProvider router={router} />
    </Provider>
  </React.StrictMode>,
);
