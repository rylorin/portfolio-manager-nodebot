import { Box, HStack, Link, Spacer, Text, VStack } from "@chakra-ui/react";
import { default as React } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { ReportEntry } from "../../../../routers/reports.types";
import Number from "../../Number/Number";
import { StatementLink } from "../Statement/links";
import { formatMonth } from "./utils";

interface Props {
  theReports: ReportEntry[];
}

/**
 * Fees table component
 * @param theReports Tax reports to summarize. Assume their summaries are sorted by date
 * @returns
 */
const Fees = ({ theReports, ..._rest }: Props): React.ReactNode => {
  const { portfolioId } = useParams();

  return (
    <>
      <VStack align="left">
        <HStack alignContent="left" borderBottom="1px" borderColor="gray.200">
          <Box width="120px">Month</Box>
          <Box width="120px" textAlign="right">
            Amount
          </Box>
          <Spacer />
        </HStack>
        {theReports.map((report) => (
          <HStack alignContent="left" key={`${report.year}-${report.month}`}>
            <Link asChild>
              <RouterLink to={StatementLink.toMonth(portfolioId, report.year, report.month)}>
                <Text width="120px">{formatMonth(report.year, report.month)}</Text>
              </RouterLink>
            </Link>
            <Number value={report.feesSummary.totalAmountInBase} width="120px" />
            <Spacer />
          </HStack>
        ))}
        <HStack borderTop="1px" borderColor="gray.200">
          <Text width="120px">Total</Text>
          <Number width="120px" value={theReports.reduce((p, report) => p + report.feesSummary.totalAmountInBase, 0)} />
          <Spacer />
        </HStack>
      </VStack>
    </>
  );
};

export default Fees;
