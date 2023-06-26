import { ChakraBaseProvider } from "@chakra-ui/react";
import { default as React } from "react";
import { createRoot } from "react-dom/client";
import { Outlet, RouterProvider, createBrowserRouter } from "react-router-dom";
import Layout from "./components/Layout/Layout";
import BalancesIndex from "./components/Portfolio/Balance/BalancesIndex";
import { balancesIndexLoader } from "./components/Portfolio/Balance/loaders";
import PortfolioEdit from "./components/Portfolio/Portfolio/PortfolioEdit";
import { default as PortfolioShow } from "./components/Portfolio/Portfolio/PortfolioShow";
import { portfolioLoader } from "./components/Portfolio/Portfolio/loaders";
import { default as PortfolioIndex } from "./components/Portfolio/PortfolioIndex";
import PortfolioLayout from "./components/Portfolio/PortfolioLayout";
import OptionsPositions from "./components/Portfolio/Position/OptionsPositions";
import PositionShow from "./components/Portfolio/Position/PositionShow";
import PositionsIndex from "./components/Portfolio/Position/PositionsIndex";
import { positionDelete } from "./components/Portfolio/Position/actions";
import {
  positionShowLoader,
  positionsIndexLoader,
  positionsOptionsLoader,
} from "./components/Portfolio/Position/loaders";
import { default as StatementIndex } from "./components/Portfolio/Statement/StatementIndex";
import { default as StatementShow } from "./components/Portfolio/Statement/StatementShow";
import { default as StatementSummary } from "./components/Portfolio/Statement/StatementSummary";
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
import TradeShow from "./components/Portfolio/Trade/TradeShow";
import TradeSummary from "./components/Portfolio/Trade/TradeSummary";
import {
  tradeSummaryLoader12M,
  tradeSummaryLoaderAll,
  tradeSummaryLoaderYTD,
  tradesShowLoader,
} from "./components/Portfolio/Trade/loaders";
import { action as PortfolioAction } from "./components/Portfolio/actions";
import { portfolioIndexLoader } from "./components/Portfolio/loaders";
import "./globals.css";
import theme from "./theme";

const router = createBrowserRouter([
  { path: "/", element: <Layout>(Home)</Layout> },
  { path: "/blog", element: <Layout>(Blog)</Layout> },
  {
    path: "/portfolio/*",
    element: (
      <Layout>
        <Outlet />
      </Layout>
    ),
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
          { index: true, Component: PortfolioShow, loader: portfolioLoader },
          { path: "edit", Component: PortfolioEdit, loader: portfolioLoader },

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
                  { path: "CreateTrade/:statementId", action: statementCreateTrade },
                  { path: "GuessTrade/:statementId", action: statementGuessTrade },
                  { path: "AddToTrade/:statementId/:tradeId", action: statementAddToTrade },
                  { path: "UnlinkTrade/:statementId", action: statementUnlinkTrade },
                  { path: "DeleteStatement/:statementId", action: statementDelete },
                ],
              },
              {
                path: "id/:statementId",
                action: PortfolioAction,
                children: [
                  { index: true, Component: StatementShow, loader: statementShowLoader },
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
              { path: "all", Component: PositionsIndex, loader: positionsIndexLoader },
              {
                path: "options",
                children: [
                  { index: true, Component: OptionsPositions, loader: positionsOptionsLoader },
                  {
                    path: "id/:positionId",
                    action: PortfolioAction,
                    children: [
                      { index: true, Component: PositionShow, loader: positionShowLoader },
                      // { path: "edit", Component: TradeEdit, loader: tradesShowLoader },
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
                  // { path: "edit", Component: TradeEdit, loader: tradesShowLoader },
                ],
              },
            ],
          },
          // { path: "*", Component: Portfolio },
        ],
        // errorElement: <ErrorPage />,
      },
      // { path: "*", Component: Root, errorElement: <ErrorPage /> },
    ],
  },
]);

const root = createRoot(document.getElementById("root"));
root.render(
  <ChakraBaseProvider theme={theme}>
    <RouterProvider router={router} />
  </ChakraBaseProvider>,
);
