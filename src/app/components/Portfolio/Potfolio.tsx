import React from "react";
import { Route, Routes } from "react-router-dom";
import PortfolioEdit from "./PortfolioEdit";
import PortfolioIndex from "./PortfolioIndex";
import PortfolioShow from "./PortfolioShow";
import { default as StatementIndex } from "./Statement/StatementIndex";
import StatementSummary from "./Statement/StatementSummary";
import { statementMonthLoader } from "./Statement/loaders";

export const action = (): string => {
  console.log("Portfolio action called");
  return "qqch";
};

const Portfolio = (): JSX.Element => {
  return (
    <Routes>
      <Route index element={<PortfolioIndex />} />
      <Route path="/:portfolioId" element={<PortfolioShow />} />
      <Route path="/:portfolioId/edit" element={<PortfolioEdit />} />
      <Route path="/:portfolioId/statements" element={<StatementSummary />} />
      <Route path="/:portfolioId/statements/:year/:month" element={<StatementIndex />} loader={statementMonthLoader} />
    </Routes>
  );
};

export default Portfolio;
