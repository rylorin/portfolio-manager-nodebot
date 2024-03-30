import { Box, Link, Spacer } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Link as RouterLink, useLoaderData, useParams } from "react-router-dom";
import { ReportEntry } from "../../../../routers/reports.types";
import StatementsTable from "../Statement/StatementsTable";
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
      {theReports.map((theReport) => (
        <Box key={`${theReport.year}-${theReport.month}`}>
          <h3>
            {theReport.year}-{theReport.month}
          </h3>
          <StatementsTable content={theReport.dividendsDetails} title={`${theReport.year}-${theReport.month}`} />
        </Box>
      ))}

      <h2>Interests</h2>
      {theReports.map((theReport) => (
        <Box key={`${theReport.year}-${theReport.month}`}>
          <h3>
            {theReport.year}-{theReport.month}
          </h3>
          <StatementsTable content={theReport.interestsDetails} title={`${theReport.year}-${theReport.month}`} />
        </Box>
      ))}

      <h2>Fees</h2>
      {theReports.map((theReport) => (
        <Box key={`${theReport.year}-${theReport.month}`}>
          <h3>
            {theReport.year}-{theReport.month}
          </h3>
          <StatementsTable content={theReport.feesDetails} title={`${theReport.year}-${theReport.month}`} />
        </Box>
      ))}

      <h2>P/L</h2>
      {theReports.map((theReport) => (
        <Box key={`${theReport.year}-${theReport.month}`}>
          <h3>
            {theReport.year}-{theReport.month}
          </h3>
          <StatementsTable content={theReport.tradesDetails} title={`${theReport.year}-${theReport.month}`} />
        </Box>
      ))}

      <h2>Other statements</h2>
      {theReports.map((theReport) => (
        <Box key={`${theReport.year}-${theReport.month}`}>
          <h3>
            {theReport.year}-{theReport.month}
          </h3>
          <StatementsTable content={theReport.otherDetails} title={`${theReport.year}-${theReport.month}`} />
        </Box>
      ))}
    </>
  );
};

export default ReportDetails;
