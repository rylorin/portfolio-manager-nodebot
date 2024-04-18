import { Box, Link, Spacer } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Link as RouterLink, useLoaderData, useParams } from "react-router-dom";
import { ReportEntry } from "../../../../routers/reports.types";
import DividendsDetails from "./DividendsDetails";
import FeesDetails from "./FeesDetails";
import InterestsDetails from "./InterestsDetails";
import OtherDetails from "./OtherDetails";
import PnLsDetails from "./PnLsDetails";
import { ReportLink } from "./links";

type Props = Record<string, never>;

/**
 * Statements list component
 * @param param0
 * @returns
 */
const ReportDetails: FunctionComponent<Props> = ({ ..._rest }): React.ReactNode => {
  const { portfolioId } = useParams();
  const theReports = useLoaderData() as ReportEntry[];

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
      <DividendsDetails theReports={theReports} />

      <h2>Interests</h2>
      <InterestsDetails theReports={theReports} />

      <h2>Fees</h2>
      <FeesDetails theReports={theReports} />

      <h2>P/L</h2>
      <PnLsDetails theReports={theReports} />

      <h2>Other statements</h2>
      <OtherDetails theReports={theReports} />
    </>
  );
};

export default ReportDetails;
