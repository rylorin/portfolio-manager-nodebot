import { Link, Table, TableCaption } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Link as RouterLink, useLoaderData, useParams } from "react-router-dom";
import { ReportEntry } from "../../../../routers/reports.types";
import BarChart, { DataSet } from "../../Chart/BarChart";
import Number from "../../Number/Number";
import { StatementLink } from "../Statement/links";
import { ReportLink } from "./links";
import { reportsIndexLoader } from "./loaders";

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
  const theReports: ReportEntry[] = useLoaderData<typeof reportsIndexLoader>().sort(compareReports);
  const years = theReports
    .reduce((p, v) => {
      if (!p.includes(v.year)) p.push(v.year);
      return p;
    }, [] as number[])
    .sort((a, b) => b - a);

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
          <Link asChild>
            <RouterLink to={StatementLink.toMonth(portfolioId, year, month)}>
              <Number value={value} />
            </RouterLink>
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
        <Link asChild>
          <RouterLink to={ReportLink.toDetails(portfolioId, year)}>
            <Number value={value} />
          </RouterLink>
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
      data: theReports.map((item) => item.dividendsSummary.reduce((p, v) => (p += v.netAmountInBase), 0)),
    },
    {
      label: "Interests",
      data: theReports.map((item) => item.interestsSummary.reduce((p, v) => p + v.netTotal, 0)),
    },
    { label: "Fees", data: theReports.map((item) => item.feesSummary.totalAmountInBase) },
  ];

  return (
    <>
      <BarChart
        title="Realized Performance"
        labels={theReports.map((item) => `${item.year}-${item.month}`)}
        datasets={datasets}
      />
      <Table.Root variant="line" size="sm" className="table-tiny">
        <TableCaption>Available reports ({theReports.length})</TableCaption>
        <Table.Header>
          <Table.Row>
            <Table.Cell>Year</Table.Cell>
            {months.map((month) => {
              return (
                <Table.Cell key={month} textAlign="end">
                  {month}
                </Table.Cell>
              );
            })}
            <Table.Cell textAlign="end">Total</Table.Cell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {years.map((year) => (
            <Table.Row key={year}>
              <Table.Cell>
                <Link asChild>
                  <RouterLink to={ReportLink.toSummary(portfolioId, year)}>{year}</RouterLink>
                </Link>
              </Table.Cell>
              {months.map((month, i) => {
                return (
                  <Table.Cell key={year + "-" + month} textAlign="end">
                    <Cell year={year} month={i + 1} />
                  </Table.Cell>
                );
              })}
              <Table.Cell textAlign="end">
                <TotalCell year={year} />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </>
  );
};

export default ReportsIndex;
