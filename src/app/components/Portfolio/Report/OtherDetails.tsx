import { IconButton, Link } from "@chakra-ui/react";
import { createColumnHelper } from "@tanstack/react-table";
import { default as React } from "react";
import { FaSearch as SearchIcon } from "react-icons/fa";
import { Link as RouterLink, useParams } from "react-router-dom";
import { StatementTypes } from "../../../../models/types";
import { ReportEntry, StatementEntry } from "../../../../routers";
import Number from "../../Number/Number";
import Tooltip from "../../ui/tooltip";
import { StatementLink } from "../Statement/links";
import { DataTable } from "./DataTable";

interface Props {
  theReports: ReportEntry[];
}

interface RowDetails {
  id: number;
  date: Date;
  amount: number;
  description: string;
}

const columnHelper = createColumnHelper<RowDetails>();

/**
 * Dividends table component
 * @param theReports Underlying tax reports. Assume their summaries are sorted by date
 * @returns
 */
const OtherDetails = ({ theReports, ..._rest }: Props): React.ReactNode => {
  const { portfolioId } = useParams();

  let totalAmount = 0;

  const data: RowDetails[] = theReports
    .reduce((p, report) => p.concat(report.otherDetails), [] as StatementEntry[])
    .map((statement) => {
      let result: RowDetails;
      switch (statement.statementType) {
        case StatementTypes.DividendStatement:
        case StatementTypes.TaxStatement:
        case StatementTypes.InterestStatement:
        case StatementTypes.WithHoldingStatement:
        case StatementTypes.BondStatement:
        case StatementTypes.EquityStatement:
        case StatementTypes.OptionStatement:
        case StatementTypes.FeeStatement:
        case StatementTypes.CashStatement:
        case StatementTypes.CorporateStatement:
        case StatementTypes.SalesTaxStatement:
        case StatementTypes.PriceAdjustments:
          result = {
            id: statement.id,
            date: new Date(statement.date),
            amount: statement.amount * statement.fxRateToBase,
            description: statement.description,
          };
          break;
        default:
          throw Error(`Unimplemented statement type: #${(statement as StatementEntry).id}`);
      }
      totalAmount += result.amount;
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
    columnHelper.accessor("amount", {
      cell: (info) => <Number value={info.getValue()} decimals={2} />,
      meta: {
        isNumeric: true,
      },
      footer: () => <Number value={totalAmount} />,
    }),
    columnHelper.accessor("description", {
      cell: (info) => info.getValue(),
    }),
  ];

  return <DataTable columns={columns} data={data} title="Other" />;
};

export default OtherDetails;
