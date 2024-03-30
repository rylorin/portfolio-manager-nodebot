import { Box, HStack, Spacer, Text, VStack } from "@chakra-ui/react";
import { default as React } from "react";
import { DididendSummary, ReportEntry } from "../../../../routers/reports.types";
import Number from "../../Number/Number";

type Props = { theReports: ReportEntry[] };

const _compareReports = (a: ReportEntry, b: ReportEntry): number => {
  let result = a.year - b.year;
  if (!result) result = a.month - b.month;
  return result;
};

const OneCountryTable = ({
  theReports,
  country,
  ..._rest
}: {
  theReports: ReportEntry[];
  country: string;
}): React.ReactNode => {
  let grossTotal = 0;
  let taxesTotal = 0;
  let netTotal = 0;
  const addToTotal = (summary: DididendSummary): React.ReactNode => {
    grossTotal += summary.grossAmountInBase;
    taxesTotal += summary.taxes;
    netTotal += summary.grossAmountInBase + summary.taxes;
    return <></>;
  };

  return (
    <>
      <VStack>
        {theReports.map((report) =>
          report.dividendsSummary
            .filter((summary: DididendSummary) => summary.country == country)
            .map((item) => (
              <HStack key={`${report.year}-${report.month}-${item.country}`}>
                <Text width="120px">
                  {report.year}-{report.month}
                </Text>
                <Number value={item.grossAmountInBase} width="120px" />
                <Number value={item.taxes} width="120px" />
                <Number value={item.grossAmountInBase + item.taxes} width="120px" />
                {addToTotal(item)}
              </HStack>
            )),
        )}
        <HStack>
          <Text width="120px">Subtotal</Text>
          <Number value={grossTotal} width="120px" />
          <Number value={taxesTotal} width="120px" />
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
const Dividends = ({ theReports, ..._rest }: Props): React.ReactNode => {
  let grossTotal = 0;
  let taxesTotal = 0;
  let netTotal = 0;
  const countries: string[] = [];
  theReports.forEach((report) => {
    report.dividendsSummary.forEach((summary) => {
      if (!countries.includes(summary.country)) countries.push(summary.country);
      grossTotal += summary.grossAmountInBase;
      taxesTotal += summary.taxes;
      netTotal += summary.grossAmountInBase + summary.taxes;
    });
  });

  return (
    <>
      <h2>Dividends</h2>
      <VStack align="left">
        <HStack alignContent="left" borderBottom="1px" borderColor="gray.200">
          <Box width="120px">Country</Box>
          <Box width="120px">Month</Box>
          <Box width="120px" textAlign="right">
            Gross Amount
          </Box>
          <Box width="120px" textAlign="right">
            Taxes
          </Box>
          <Box width="120px" textAlign="right">
            Net Amount
          </Box>
          <Spacer />
        </HStack>
        {countries.map((country) => (
          <HStack alignContent="left" key={country} borderBottom="1px" borderColor="gray.200">
            <Box width="120px">{country}</Box>
            <OneCountryTable theReports={theReports} country={country} />
          </HStack>
        ))}
        <HStack>
          <Text width="120px">Total</Text>
          <Box width="120px"></Box>
          <Number value={grossTotal} width="120px" />
          <Number value={taxesTotal} width="120px" />
          <Number value={netTotal} width="120px" />
          <Spacer />
        </HStack>
      </VStack>
    </>
  );
};

export default Dividends;
