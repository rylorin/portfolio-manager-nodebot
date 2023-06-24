import { FunctionComponent, default as React } from "react";
import PortfolioLayout from "../PortfolioLayout";

type StatementShowProps = Record<string, never>;

/**
 * Statements list component
 * @param param0
 * @returns
 */
const StatementShow: FunctionComponent<StatementShowProps> = ({ ..._rest }): JSX.Element => {
  // const { portfolioId, year, month } = useParams();
  // const theStatement = useLoaderData() as Statement;

  return <PortfolioLayout>theStatement</PortfolioLayout>;
};

export default StatementShow;
