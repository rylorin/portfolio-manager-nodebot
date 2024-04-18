import { Box, Link, Spacer } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Link as RouterLink, useLoaderData, useParams } from "react-router-dom";
import { ReportEntry } from "../../../../routers/reports.types";
import Dividends from "./DividendsComponent";
import Fees from "./FeesComponent";
import Interests from "./InterestsComponent";
import PnL from "./PnLsComponent";
import { ReportLink } from "./links";

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
  const { portfolioId } = useParams();
  const theReports: ReportEntry[] = (useLoaderData() as ReportEntry[]).sort(compareReports);

  return (
    <>
      <Box>
        <Spacer />
        <Link to={ReportLink.toIndex(portfolioId)} as={RouterLink}>
          Index
        </Link>
        <Spacer />
      </Box>

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
