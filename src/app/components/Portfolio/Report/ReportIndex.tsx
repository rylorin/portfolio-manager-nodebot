import { Link, Table, TableCaption, TableContainer, Tbody, Td, Thead, Tr } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Link as RouterLink, useLoaderData, useParams } from "react-router-dom";
import { ReportEntry } from "../../../../routers/reports.types";
import Number from "../../Number/Number";
import { StatementLink } from "../Statement/links";
import { ReportLink } from "./links";

type Props = Record<string, never>;

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Statements list component
 * @param param0
 * @returns
 */
const ReportsIndex: FunctionComponent<Props> = ({ ..._rest }): React.ReactNode => {
  const { portfolioId } = useParams();
  const theReports = useLoaderData() as ReportEntry[];
  const years = theReports.reduce((p, v) => {
    if (!p.includes(v.year)) p.push(v.year);
    return p;
  }, [] as number[]);

  const Cell = ({ year, month }: { year: number; month: number }): React.ReactNode => {
    const report = theReports.find((item) => item.year == year && item.month == month);
    const value = report
      ? report.dividendsSummary.reduce((p, v) => p + v.grossAmountInBase, 0) +
        report.interestsSummary.totalAmountInBase +
        report.feesSummary.totalAmountInBase
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

  return (
    <>
      <TableContainer>
        <Table variant="simple" size="sm" className="table-tiny">
          <TableCaption>TableCaption</TableCaption>
          <Thead>
            <Tr>
              <Td>Year</Td>
              {months.map((month) => {
                return (
                  <td key={month} align="right">
                    {month}
                  </td>
                );
              })}
            </Tr>
          </Thead>
          <Tbody>
            {years.map((year) => (
              <Tr key={year}>
                <td>
                  <Link to={ReportLink.toItem(portfolioId, year)} as={RouterLink}>
                    {year}
                  </Link>
                </td>
                {months.map((month, i) => {
                  return (
                    <td key={year + "-" + month} align="right">
                      <Cell year={year} month={i + 1} />
                    </td>
                  );
                })}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </>
  );
};

export default ReportsIndex;
