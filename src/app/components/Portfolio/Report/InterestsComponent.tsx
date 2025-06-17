import { Box, HStack, Link, Spacer, Text, VStack } from "@chakra-ui/react";
import { default as React } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { InterestsSummary, ReportEntry } from "../../../../routers/reports.types";
import Number from "../../Number/Number";
import { StatementLink } from "../Statement/links";
import { formatMonth } from "./utils";

interface Props {
  theReports: ReportEntry[];
}

const _compareReports = (a: ReportEntry, b: ReportEntry): number => {
  let result = a.year - b.year;
  if (!result) result = a.month - b.month;
  return result;
};

const OneCountryTable = ({
  portfolioId,
  theReports,
  country,
  ..._rest
}: {
  portfolioId: string;
  theReports: ReportEntry[];
  country: string;
}): React.ReactNode => {
  // Store subtotal
  let creditTotal = 0;
  let debitTotal = 0;
  let withHoldingTotal = 0;
  let netTotal = 0;
  const addToTotal = (summary: InterestsSummary): React.ReactNode => {
    creditTotal += summary.grossCredit;
    debitTotal += summary.netDebit;
    withHoldingTotal += summary.withHolding;
    netTotal += summary.netTotal;
    return <></>;
  };

  return (
    <>
      <VStack>
        {theReports.map((report) =>
          report.interestsSummary
            .filter((summary: InterestsSummary) => summary.country == country)
            .map((item) => (
              <HStack key={`${report.year}-${report.month}-${item.country}`}>
                <Link asChild>
                  <RouterLink to={StatementLink.toMonth(portfolioId, report.year, report.month)}>
                    <Text width="120px">{formatMonth(report.year, report.month)}</Text>
                  </RouterLink>
                </Link>
                <Number value={item.grossCredit} width="120px" />
                <Number value={item.netDebit} width="120px" />
                <Number value={item.withHolding} width="120px" />
                <Number value={item.netTotal} width="120px" />
                {addToTotal(item)}
              </HStack>
            )),
        )}
        <HStack>
          <Text width="120px">Subtotal</Text>
          <Number value={creditTotal} width="120px" />
          <Number value={debitTotal} width="120px" />
          <Number value={withHoldingTotal} width="120px" />
          <Number value={netTotal} width="120px" />
        </HStack>
      </VStack>
    </>
  );
};

/**
 * Dividends table component
 * @param theReports Tax reports to summarize. Assume their summaries are sorted by date
 * @returns
 */
const Interests = ({ theReports, ..._rest }: Props): React.ReactNode => {
  const { portfolioId } = useParams();

  let creditTotal = 0;
  let debitTotal = 0;
  let withHoldingTotal = 0;
  let netTotal = 0;
  const countries: string[] = [];
  theReports.forEach((report) => {
    report.interestsSummary.forEach((summary) => {
      if (!countries.includes(summary.country)) countries.push(summary.country);
      creditTotal += summary.grossCredit;
      debitTotal += summary.netDebit;
      withHoldingTotal += summary.withHolding;
      netTotal += summary.netTotal;
    });
  });

  return (
    <>
      <VStack align="left">
        <HStack alignContent="left" borderBottom="1px" borderColor="gray.200">
          <Box width="120px">Country</Box>
          <Box width="120px">Month</Box>
          <Box width="120px" textAlign="right">
            Gross credit
          </Box>
          <Box width="120px" textAlign="right">
            Net debit
          </Box>
          <Box width="120px" textAlign="right">
            Withholding
          </Box>
          <Box width="120px" textAlign="right">
            Net total
          </Box>
          <Spacer />
        </HStack>
        {countries.map((country) => (
          <HStack alignContent="left" key={country} borderBottom="1px" borderColor="gray.200">
            <Box width="120px">{country}</Box>
            <OneCountryTable portfolioId={portfolioId} theReports={theReports} country={country} />
          </HStack>
        ))}
        <HStack>
          <Text width="120px">Total</Text>
          <Box width="120px"></Box>
          <Number value={creditTotal} width="120px" />
          <Number value={debitTotal} width="120px" />
          <Number value={withHoldingTotal} width="120px" />
          <Number value={netTotal} width="120px" />
          <Spacer />
        </HStack>
      </VStack>
    </>
  );
};

export default Interests;
