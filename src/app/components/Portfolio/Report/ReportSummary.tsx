import { Box, HStack, Link, SimpleGrid, Spacer, VStack } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Link as RouterLink, useLoaderData, useParams } from "react-router-dom";
import { DididendSummary, ReportEntry } from "../../../../routers/reports.types";
import Number from "../../Number/Number";
import { ReportLink } from "./links";

type Props = Record<string, never>;

/**
 * Statements list component
 * @param param0
 * @returns
 */
const ReportSummary: FunctionComponent<Props> = ({ ..._rest }): React.ReactNode => {
  const { portfolioId } = useParams();
  const theReport = useLoaderData()[0] as ReportEntry;

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
      <VStack align="left">
        <HStack alignContent="left">
          <Box width="xs">Country</Box>
          <Box width="xs" textAlign="right">
            Gross Amount
          </Box>
          <Box width="xs" textAlign="right">
            Taxes
          </Box>
          <Box width="xs" textAlign="right">
            Net Amount
          </Box>
          <Spacer />
        </HStack>
        {theReport.dividendsSummary.map((item: DididendSummary) => (
          <HStack key={item.country}>
            <Box width="xs">{item.country}</Box>
            <Box width="xs" textAlign="right">
              <Number value={item.grossAmountInBase} />
            </Box>
            <Box width="xs" textAlign="right">
              <Number value={item.taxes} />
            </Box>
            <Box width="xs" textAlign="right">
              <Number value={item.grossAmountInBase + item.taxes} />
            </Box>
            <Spacer />
          </HStack>
        ))}
        <HStack>
          <Box width="xs">Total</Box>
          <Box width="xs">Gross Amount</Box>
          <Box width="xs">Taxes</Box>
          <Box width="xs">Net Amount</Box>
          <Spacer />
        </HStack>
      </VStack>
      {/* <StatementsTable content={theReport.dividendsDetails} title="Dividends" /> */}
      <h2>Interests</h2>
      <SimpleGrid columns={2}>
        <Box>Gross credit</Box>
        <Box textAlign="right">
          <Number value={theReport.interestsSummary.grossCredit} />
        </Box>
        <Box>Tax</Box>
        <Box textAlign="right">
          <Number value={theReport.interestsSummary.withHolding} />
        </Box>
        <Box>Net debit</Box>
        <Box textAlign="right">
          <Number value={theReport.interestsSummary.netDebit} />
        </Box>
        <Box>Total</Box>
        <Box textAlign="right">
          <Number value={theReport.interestsSummary.totalAmountInBase} />
        </Box>
      </SimpleGrid>
      {/* <StatementsTable content={theReport.interestsDetails} title="Interests" /> */}
      <h2>Fees</h2>
      <HStack align="left">
        <Box>Total</Box>
        <Box textAlign="right">
          <Number value={theReport.feesSummary.totalAmountInBase} />
        </Box>
        <Spacer />
      </HStack>
      {/* <StatementsTable content={theReport.feesDetails} title="Fees" /> */}
    </>
  );
};

export default ReportSummary;
