import { Box, Link, Spacer, Table, TableCaption, TableContainer, Tbody, Td, Thead, Tr } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Link as RouterLink, useLoaderData, useParams } from "react-router-dom";
import { ReportEntry } from "../../../../routers/reports.types";
import BarChart, { DataSet } from "../../Chart/BarChart";
import Number from "../../Number/Number";
import { StatementLink } from "../Statement/links";
import { ReportLink } from "./links";

type Props = Record<string, never>;

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
const ReportsIndex: FunctionComponent<Props> = ({ ..._rest }): React.ReactNode => {
  const { portfolioId } = useParams();
  const theReports: ReportEntry[] = (useLoaderData() as ReportEntry[]).sort(compareReports);
  const years = theReports.reduce((p, v) => {
    if (!p.includes(v.year)) p.push(v.year);
    return p;
  }, [] as number[]);

  const Cell = ({ year, month }: { year: number; month: number }): React.ReactNode => {
    const report = theReports.find((item) => item.year == year && item.month == month);
    const value = report
      ? report.dividendsSummary.reduce((p, v) => p + v.netAmountInBase, 0) +
        report.interestsSummary.reduce((p, v) => p + v.netTotal, 0) +
        report.feesSummary.totalAmountInBase +
        report.tradesSummary.totalPnL
      : 0;
    return (
      <>
        {report && (
          <Link to={StatementLink.toMonth(portfolioId, year, month)} as={RouterLink}>
            <Number value={value} />
          </Link>
        )}
      </>
    );
  };

  const TotalCell = ({ year }: { year: number }): React.ReactNode => {
    const value = theReports
      .filter((item) => item.year == year)
      .reduce(
        (p, report) =>
          p +
          report.dividendsSummary.reduce((p, v) => p + v.netAmountInBase, 0) +
          report.interestsSummary.reduce((p, v) => p + v.netTotal, 0) +
          report.feesSummary.totalAmountInBase +
          report.tradesSummary.totalPnL,
        0,
      );
    return (
      <>
        <Link to={ReportLink.toDetails(portfolioId, year)} as={RouterLink}>
          <Number value={value} />
        </Link>
      </>
    );
  };

  const datasets: DataSet[] = [
    {
      label: "Stocks",
      data: theReports.map((item) => item.tradesSummary.stocksPnLInBase + item.tradesSummary.futuresPnLInBase),
    },
    {
      label: "Options",
      data: theReports.map((item) => item.tradesSummary.optionsPnLInBase + item.tradesSummary.fopPnlInBase),
    },
    {
      label: "Bonds",
      data: theReports.map((item) => item.tradesSummary.bondPnLInBase),
    },
    {
      label: "Dividends",
      data: theReports.map((item) => item.dividendsSummary.reduce((p, v) => (p += v.grossAmountInBase), 0)),
    },
    {
      label: "Interests",
      data: theReports.map((item) => item.interestsSummary.reduce((p, v) => p + v.netTotal, 0)),
    },
    { label: "Fees", data: theReports.map((item) => item.feesSummary.totalAmountInBase) },
  ];

  return (
    <>
      <Box>
        <Spacer />
        <Link to={"../ytd"} as={RouterLink}>
          YTD
        </Link>
        {" | "}
        <Link to={"../12m"} as={RouterLink}>
          12M
        </Link>
        {" | "}
        <Link to={"../index"} as={RouterLink}>
          All
        </Link>
        {/* <Routes>
          <Route index element={"All"} /> |
          <Route path="/YTD" element={"YTD"} /> |
          <Route path="/12M" element={"12M"} />
        </Routes> */}
        <Spacer />
      </Box>
      <BarChart
        title="Realized Performance"
        labels={theReports.map((item) => `${item.year}-${item.month}`)}
        datasets={datasets}
      />
      <TableContainer>
        <Table variant="simple" size="sm" className="table-tiny">
          <TableCaption>Available reports ({months.length})</TableCaption>
          <Thead>
            <Tr>
              <Td>Year</Td>
              {months.map((month) => {
                return (
                  <Td key={month} isNumeric>
                    {month}
                  </Td>
                );
              })}
              <Td isNumeric>Total</Td>
            </Tr>
          </Thead>
          <Tbody>
            {years.map((year) => (
              <Tr key={year}>
                <Td>
                  <Link to={ReportLink.toSummary(portfolioId, year)} as={RouterLink}>
                    {year}
                  </Link>
                </Td>
                {months.map((month, i) => {
                  return (
                    <Td key={year + "-" + month} isNumeric>
                      <Cell year={year} month={i + 1} />
                    </Td>
                  );
                })}
                <Td isNumeric>
                  <TotalCell year={year} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </>
  );
};

export default ReportsIndex;
