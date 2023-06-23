import { FunctionComponent, default as React } from "react";
import { useLoaderData, useParams } from "react-router-dom";
import { Statement } from "../../../../models";
import PortfolioLayout from "../PortfolioLayout";

type StatementShowProps = {};

/**
 * Statements list component
 * @param param0
 * @returns
 */
const StatementShow: FunctionComponent<StatementShowProps> = ({ ...rest }): JSX.Element => {
  const { portfolioId, year, month } = useParams();
  const theStatement = useLoaderData() as Statement;

  return <PortfolioLayout>theStatement</PortfolioLayout>;
};

export default StatementShow;
