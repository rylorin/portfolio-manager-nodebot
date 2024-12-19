import { SearchIcon } from "@chakra-ui/icons";
import { IconButton, Link, Tooltip } from "@chakra-ui/react";
import { createColumnHelper } from "@tanstack/react-table";
import { default as React } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { StatementTypes } from "../../../../models/types";
import { FeeStatementEntry, ReportEntry } from "../../../../routers";
import Number from "../../Number/Number";
import { StatementLink } from "../Statement/links";
import { DataTable } from "./DataTable";
type Props = { theReports: ReportEntry[] };

type FeesDetails = {
  id: number;
  date: Date;
  amount: number;
  description: string;
};

const columnHelper = createColumnHelper<FeesDetails>();

/**
 * Dividends table component
 * @param theReports Underlying tax reports. Assume their summaries are sorted by date
 * @returns
 */
const FeesDetails = ({ theReports, ..._rest }: Props): React.ReactNode => {
  const { portfolioId } = useParams();

  let totalFees = 0;

  const data: FeesDetails[] = theReports
    .reduce((p, report) => p.concat(report.feesDetails), [] as FeeStatementEntry[])
    .map((statement) => {
      let result: FeesDetails;
      switch (statement.statementType) {
        case StatementTypes.FeeStatement:
          result = {
            id: statement.id,
            date: new Date(statement.date),
            amount: statement.amount * statement.fxRateToBase,
            description: statement.description,
          };
          break;
      }
      totalFees += result.amount;
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
    columnHelper.accessor("amount", {
      cell: (info) => <Number value={info.getValue()} decimals={2} />,
      meta: {
        isNumeric: true,
      },
      footer: () => <Number value={totalFees} />,
    }),
    columnHelper.accessor("description", {
      cell: (info) => info.getValue(),
    }),
  ];

  return <DataTable columns={columns} data={data} title="Fees" />;
};

export default FeesDetails;
