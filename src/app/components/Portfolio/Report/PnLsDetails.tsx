import { SearchIcon } from "@chakra-ui/icons";
import { IconButton, Link, Tooltip } from "@chakra-ui/react";
import { createColumnHelper } from "@tanstack/react-table";
import { default as React } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { StatementTypes } from "../../../../models/types";
import {
  BondStatementEntry,
  EquityStatementEntry,
  OptionStatementEntry,
  ReportEntry,
  StatementUnderlyingEntry,
} from "../../../../routers/types";
import Number from "../../Number/Number";
import { StatementLink } from "../Statement/links";
import { DataTable } from "./DataTable";
type Props = { theReports: ReportEntry[] };

type PnLDetails = {
  id: number;
  date: Date;
  pnl: number;
  underlying: StatementUnderlyingEntry;
  description: string;
};

const columnHelper = createColumnHelper<PnLDetails>();

/**
 * Interests table component
 * @param theReports Underlying tax reports. Assume their summaries are sorted by date
 * @returns
 */
const PnLsDetails = ({ theReports, ..._rest }: Props): React.ReactNode => {
  const { portfolioId } = useParams();

  let totalPnl = 0;

  const data: PnLDetails[] = theReports
    .reduce(
      (p, report) => p.concat(report.tradesDetails),
      [] as (EquityStatementEntry | OptionStatementEntry | BondStatementEntry)[],
    )
    .map((statement) => {
      let result: PnLDetails;
      switch (statement.statementType) {
        case StatementTypes.EquityStatement:
          result = {
            id: statement.id,
            date: new Date(statement.date),
            pnl: statement.pnl * statement.fxRateToBase,
            underlying: statement.underlying,
            description: statement.description,
          };
          break;
        case StatementTypes.OptionStatement:
          result = {
            id: statement.id,
            date: new Date(statement.date),
            pnl: statement.pnl * statement.fxRateToBase,
            underlying: statement.underlying,
            description: statement.description,
          };
          break;
        case StatementTypes.BondStatement:
          result = {
            id: statement.id,
            date: new Date(statement.date),
            pnl: statement.pnl * statement.fxRateToBase,
            underlying: statement.underlying,
            description: statement.description,
          };
          break;
      }
      totalPnl += result.pnl;
      return result;
    })
    .filter((item) => item.pnl);

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
    columnHelper.accessor("underlying", {
      cell: (info) => info.getValue().symbol,
      sortingFn: (a, b) =>
        (a.getValue("underlying") as StatementUnderlyingEntry).symbol.localeCompare(
          (b.getValue("underlying") as StatementUnderlyingEntry).symbol,
        ),
      footer: () => <Number value={totalPnl} />,
    }),
    columnHelper.accessor("pnl", {
      cell: (info) => <Number value={info.getValue()} decimals={2} />,
      meta: {
        isNumeric: true,
      },
      footer: () => <Number value={totalPnl} />,
    }),
    columnHelper.accessor("description", {
      cell: (info) => info.getValue(),
    }),
  ];

  return <DataTable columns={columns} data={data} title="P/L" />;
};

export default PnLsDetails;
