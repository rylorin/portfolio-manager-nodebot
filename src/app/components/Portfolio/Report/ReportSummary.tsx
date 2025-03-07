import { FunctionComponent, default as React } from "react";
import { useLoaderData } from "react-router-dom";
import { ReportEntry } from "../../../../routers/reports.types";
import Dividends from "./DividendsComponent";
import Fees from "./FeesComponent";
import Interests from "./InterestsComponent";
import PnL from "./PnLsComponent";

type Props = Record<string, never>;

const compareReports = (a: ReportEntry, b: ReportEntry): number => {
  let result = a.year - b.year;
  if (!result) result = a.month - b.month;
  return result;
};

/**
 * Statements list component
 * @param param0
 * @returns
 */
const ReportSummary: FunctionComponent<Props> = ({ ..._rest }): React.ReactNode => {
  const theReports: ReportEntry[] = (useLoaderData() as ReportEntry[]).sort(compareReports);

  return (
    <>
      <h2>Dividends</h2>
      <Dividends theReports={theReports} />

      <h2>Interests</h2>
      <Interests theReports={theReports} />

      <h2>Fees</h2>
      <Fees theReports={theReports} />

      <h2>P&L</h2>
      <PnL theReports={theReports} />
    </>
  );
};

export default ReportSummary;
