import { IconButton, Link } from "@chakra-ui/react";
import { createColumnHelper } from "@tanstack/react-table";
import { default as React } from "react";
import { LuSearch as SearchIcon } from "react-icons/lu";
import { Link as RouterLink, useParams } from "react-router-dom";
import { StatementTypes } from "../../../../models/types";
import { DividendStatementEntry, ReportEntry, TaxStatementEntry } from "../../../../routers";
import Number from "../../Number/Number";
import Tooltip from "../../ui/tooltip";
import { StatementLink } from "../Statement/links";
import { DataTable } from "./DataTable";

interface Props {
  theReports: ReportEntry[];
}

interface DividendDetails {
  id: number;
  date: Date;
  country: string;
  amount: number;
  tax: number;
  description: string;
}

const columnHelper = createColumnHelper<DividendDetails>();

/**
 * Dividends table component
 * @param theReports Underlying tax reports. Assume their summaries are sorted by date
 * @returns
 */
const DividendsDetails = ({ theReports, ..._rest }: Props): React.ReactNode => {
  const { portfolioId } = useParams();

  let totalAmount = 0;
  let totalTax = 0;

  const data: DividendDetails[] = theReports
    .reduce((p, report) => p.concat(report.dividendsDetails), [] as (DividendStatementEntry | TaxStatementEntry)[])
    .map((statement) => {
      let result: DividendDetails;
      switch (statement.statementType) {
        case StatementTypes.DividendStatement:
          result = {
            id: statement.id,
            date: new Date(statement.date),
            country: statement.country,
            amount: statement.amount * statement.fxRateToBase,
            tax: 0,
            description: statement.description,
          };
          break;
        case StatementTypes.TaxStatement:
          result = {
            id: statement.id,
            date: new Date(statement.date),
            country: statement.country,
            amount: 0,
            tax: statement.amount * statement.fxRateToBase,
            description: statement.description,
          };
          break;
        // default:
        //   throw Error(`Unimplemented statement type: #${statement.id}`);
      }
      totalAmount += result.amount;
      totalTax += result.tax;
      return result;
    });

  const columns = [
    columnHelper.accessor("id", {
      cell: (info) => (
        <Link asChild>
          <RouterLink to={StatementLink.toItem(portfolioId, info.getValue())}>
            <IconButton aria-label="Show detail" size="xs" variant="ghost">
              <SearchIcon />
            </IconButton>
          </RouterLink>
        </Link>
      ),
      header: "#",
    }),
    columnHelper.accessor("date", {
      cell: (info) => (
        <Tooltip content={info.getValue().toLocaleTimeString()} showArrow>
          {info.getValue().toLocaleDateString()}
        </Tooltip>
      ),
      footer: "Total",
    }),
    columnHelper.accessor("country", {
      cell: (info) => info.getValue(),
      header: "CY",
    }),
    columnHelper.accessor("amount", {
      cell: (info) => <Number value={info.getValue()} decimals={2} />,
      meta: {
        isNumeric: true,
      },
      footer: () => <Number value={totalAmount} />,
    }),
    columnHelper.accessor("tax", {
      cell: (info) => <Number value={info.getValue()} decimals={2} />,
      header: "Tax",
      meta: {
        isNumeric: true,
      },
      footer: () => <Number value={totalTax} />,
    }),
    columnHelper.accessor("description", {
      cell: (info) => info.getValue(),
    }),
  ];

  return <DataTable columns={columns} data={data} title="Dividends" />;
};

export default DividendsDetails;
