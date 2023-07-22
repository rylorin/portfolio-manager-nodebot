import { ChakraBaseProvider } from "@chakra-ui/react";
import { default as React } from "react";
import { createRoot } from "react-dom/client";
import { Outlet, RouterProvider, createBrowserRouter } from "react-router-dom";
import Layout from "./components/Layout/Layout";
import BalancesIndex from "./components/Portfolio/Balance/BalancesIndex";
import { balancesIndexLoader } from "./components/Portfolio/Balance/loaders";
import ContractShow from "./components/Portfolio/Contract/ContractShow";
import { contractShowLoader } from "./components/Portfolio/Contract/loaders";
import PortfolioLayout from "./components/Portfolio/Layout/PortfolioLayout";
import { action as PortfolioAction } from "./components/Portfolio/Layout/actions";
import PortfolioEdit from "./components/Portfolio/Portfolio/PortfolioEdit";
import PortfolioShow from "./components/Portfolio/Portfolio/PortfolioShow";
import { portfolioLoader } from "./components/Portfolio/Portfolio/loaders";
import { default as PortfolioIndex } from "./components/Portfolio/PortfolioIndex";
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
import { default as StatementShow } from "./components/Portfolio/Statement/StatementShow";
import { default as StatementSummary } from "./components/Portfolio/Statement/StatementSummary";
import { default as StatementIndex } from "./components/Portfolio/Statement/StatementsTable";
import {
  statementAddToTrade,
  statementCreateTrade,
  statementDelete,
  statementGuessTrade,
  statementUnlinkTrade,
} from "./components/Portfolio/Statement/actions";
import {
  statementMonthLoader,
  statementShowLoader,
  statementSummaryLoader12M,
  statementSummaryLoaderAll,
  statementSummaryLoaderYTD,
} from "./components/Portfolio/Statement/loaders";
import TradeEdit from "./components/Portfolio/Trade/TradeEdit";
import TradeShow from "./components/Portfolio/Trade/TradeShow";
import TradeSummary from "./components/Portfolio/Trade/TradeSummary";
import TradesTable from "./components/Portfolio/Trade/TradesTable";
import { tradeDelete, tradeSave } from "./components/Portfolio/Trade/actions";
import {
  tradeSummaryLoader12M,
  tradeSummaryLoaderAll,
  tradeSummaryLoaderYTD,
  tradesMonthLoader,
  tradesShowLoader,
} from "./components/Portfolio/Trade/loaders";
import { portfolioIndexLoader } from "./components/Portfolio/loaders";
import ErrorPage from "./error-page";
import "./globals.css";
import theme from "./theme";

const router = createBrowserRouter([
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
          { index: true, Component: PortfolioIndex, loader: portfolioIndexLoader },
          {
            path: ":portfolioId",
            element: (
              <PortfolioLayout>
                <Outlet />
              </PortfolioLayout>
            ),
            children: [
              /* Portfolio parameters */
              {
                path: "parameters",
                children: [
                  { index: true, Component: PortfolioShow, loader: portfolioLoader },
                  { path: "edit", Component: PortfolioEdit, loader: portfolioLoader },
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
                      { path: "ytd", Component: StatementSummary, loader: statementSummaryLoaderYTD },
                      { path: "12m", Component: StatementSummary, loader: statementSummaryLoader12M },
                      { path: "all", Component: StatementSummary, loader: statementSummaryLoaderAll },
                    ],
                  },
                  {
                    path: "month/:year/:month",
                    action: PortfolioAction,
                    children: [
                      { index: true, Component: StatementIndex, loader: statementMonthLoader },
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
                      { index: true, Component: StatementShow, loader: statementShowLoader },
                      { path: "edit", Component: StatementShow, loader: statementShowLoader },
                      { path: "CreateTrade", action: statementCreateTrade },
                      { path: "GuessTrade", action: statementGuessTrade },
                      { path: "AddToTrade/:tradeId", action: statementAddToTrade },
                      { path: "UnlinkTrade", action: statementUnlinkTrade },
                    ],
                  },
                ],
              },

              /* Positions */
              {
                path: "positions",
                action: PortfolioAction,
                children: [
                  {
                    path: "all",
                    children: [
                      { index: true, Component: PositionsIndex, loader: positionsIndexLoader },
                      {
                        path: "id/:positionId",
                        action: PortfolioAction,
                        children: [
                          { index: true, Component: PositionShow, loader: positionShowLoader },
                          { path: "edit", Component: PositionEdit, loader: positionShowLoader, action: positionSave },
                        ],
                      },
                      { path: "DeletePosition/:positionId", action: positionDelete },
                      { path: "PositionGuessTrade/:positionId", action: positionGuessTrade },
                      { path: "PositionAddToTrade/:positionId/:tradeId", action: positionAddToTrade },
                      { path: ":positionId/PositionUnlinkTrade", action: positionUnlinkTrade },
                    ],
                  },
                  {
                    path: "options",
                    children: [
                      { index: true, Component: OptionsPositions, loader: positionsOptionsLoader },
                      {
                        path: "id/:positionId",
                        action: PortfolioAction,
                        children: [
                          { index: true, Component: PositionShow, loader: positionShowLoader },
                          { path: "edit", Component: PositionEdit, loader: positionShowLoader },
                        ],
                      },
                      { path: "DeletePosition/:positionId", action: positionDelete },
                    ],
                  },
                ],
              },

              /* Balances */
              {
                path: "balances",
                action: PortfolioAction,
                children: [{ index: true, Component: BalancesIndex, loader: balancesIndexLoader }],
              },

              /* Trades */
              {
                path: "trades",
                action: PortfolioAction,
                children: [
                  {
                    path: "summary",
                    action: PortfolioAction,
                    children: [
                      { path: "ytd", Component: TradeSummary, loader: tradeSummaryLoaderYTD },
                      { path: "12m", Component: TradeSummary, loader: tradeSummaryLoader12M },
                      { path: "all", Component: TradeSummary, loader: tradeSummaryLoaderAll },
                    ],
                  },
                  {
                    path: "id/:tradeId",
                    action: PortfolioAction,
                    children: [
                      { index: true, Component: TradeShow, loader: tradesShowLoader },
                      { path: "edit", Component: TradeEdit, loader: tradesShowLoader, action: tradeSave },
                      { path: "delete", action: tradeDelete },
                      { path: "StatementCreateTrade/:statementId", action: statementCreateTrade },
                      { path: "StatementGuessTrade/:statementId", action: statementGuessTrade },
                      { path: "StatementAddToTrade/:statementId/:tradeId", action: statementAddToTrade },
                      { path: "StatementUnlinkTrade/:statementId", action: statementUnlinkTrade },
                      { path: "DeleteStatement/:statementId", action: statementDelete },
                    ],
                  },
                  {
                    path: "month/:year/:month",
                    Component: TradesTable,
                    loader: tradesMonthLoader,
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
                    Component: ContractShow,
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
            ],
          },
        ],
      },
    ],
  },
]);

const root = createRoot(document.getElementById("root"));
root.render(
  <ChakraBaseProvider theme={theme}>
    <RouterProvider router={router} />
  </ChakraBaseProvider>,
);
