import { SearchIcon } from "@chakra-ui/icons";
import { IconButton, Link, Tooltip } from "@chakra-ui/react";
import { createColumnHelper } from "@tanstack/react-table";
import { default as React } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { StatementTypes } from "../../../../models/types";
import { InterestStatementEntry, ReportEntry, WithHoldingStatementEntry } from "../../../../routers";
import Number from "../../Number/Number";
import { StatementLink } from "../Statement/links";
import { DataTable } from "./DataTable";
type Props = { theReports: ReportEntry[] };

type InterestDetails = {
  id: number;
  date: Date;
  country: string;
  credit: number;
  debit: number;
  withHolding: number;
  description: string;
};

const columnHelper = createColumnHelper<InterestDetails>();

/**
 * Interests table component
 * @param theReports Underlying tax reports. Assume their summaries are sorted by date
 * @returns
 */
const InterestsDetails = ({ theReports, ..._rest }: Props): React.ReactNode => {
  const { portfolioId } = useParams();

  let totalCredit = 0;
  let totalDebit = 0;
  let totalTax = 0;

  const data: InterestDetails[] = theReports
    .reduce(
      (p, report) => p.concat(report.interestsDetails),
      [] as (InterestStatementEntry | WithHoldingStatementEntry)[],
    )
    .map((statement) => {
      let result: InterestDetails;
      switch (statement.statementType) {
        case StatementTypes.InterestStatement:
          result = {
            id: statement.id,
            date: new Date(statement.date),
            country: statement.country,
            credit: statement.amount > 0 ? statement.amount * statement.fxRateToBase : 0,
            debit: statement.amount < 0 ? statement.amount * statement.fxRateToBase : 0,
            withHolding: 0,
            description: statement.description,
          };
          break;
        case StatementTypes.WithHoldingStatement:
          result = {
            id: statement.id,
            date: new Date(statement.date),
            country: "",
            credit: 0,
            debit: 0,
            withHolding: statement.amount * statement.fxRateToBase,
            description: statement.description,
          };
          break;
        // case StatementTypes.BondStatement:
        //   result = {
        //     id: statement.id,
        //     date: new Date(statement.date),
        //     country: statement.country,
        //     credit: statement.accruedInterests > 0 ? statement.accruedInterests * statement.fxRateToBase : 0,
        //     debit: statement.accruedInterests < 0 ? statement.accruedInterests * statement.fxRateToBase : 0,
        //     withHolding: 0,
        //     description: statement.description,
        //   };
        //   break;
      }
      totalCredit += result.credit;
      totalDebit += result.debit;
      totalTax += result.withHolding;
      return result;
    });

  const columns = [
    columnHelper.accessor("id", {
      cell: (info) => (
        <Link to={StatementLink.toItem(portfolioId, info.getValue())} as={RouterLink}>
          <IconButton aria-label="Show detail" icon={<SearchIcon />} size="xs" variant="ghost" />
        </Link>
      ),
      header: "#",
    }),
    columnHelper.accessor("date", {
      cell: (info) => (
        <Tooltip label={info.getValue().toLocaleTimeString()} placement="auto" hasArrow={true}>
          {info.getValue().toLocaleDateString()}
        </Tooltip>
      ),
      footer: "Total",
    }),
    columnHelper.accessor("country", {
      cell: (info) => info.getValue(),
      header: "CY",
    }),
    columnHelper.accessor("credit", {
      cell: (info) => <Number value={info.getValue()} decimals={2} />,
      meta: {
        isNumeric: true,
      },
      footer: () => <Number value={totalCredit} />,
    }),
    columnHelper.accessor("debit", {
      cell: (info) => <Number value={info.getValue()} decimals={2} />,
      meta: {
        isNumeric: true,
      },
      footer: () => <Number value={totalDebit} />,
    }),
    columnHelper.accessor("withHolding", {
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

  return <DataTable columns={columns} data={data} title="Interests" />;
};

export default InterestsDetails;
