import { Box, HStack, Spacer, Text, VStack } from "@chakra-ui/react";
import { default as React } from "react";
import { ReportEntry } from "../../../../routers/reports.types";
import Number from "../../Number/Number";

type Props = { theReports: ReportEntry[] };

const _compareReports = (a: ReportEntry, b: ReportEntry): number => {
  let result = a.year - b.year;
  if (!result) result = a.month - b.month;
  return result;
};

/**
 * Fees table component
 * @param theReports Tax reports to summarize. Assume their summaries are sorted by date
 * @returns
 */
const Fees = ({ theReports, ..._rest }: Props): React.ReactNode => {
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
            <Text width="120px">
              {report.year}-{report.month}
            </Text>
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
