import { Link, Table, TableCaption, TableContainer, Tbody, Td, Tfoot, Thead, Tr } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";
import { Link as RouterLink } from "react-router-dom";
import { TradeMonthlySynthesys } from "../../../../routers/trades.types";
import { formatNumber } from "../../../utils";
import Number from "../../Number/Number";

type TradesMonthlyTableProps = {
  title?: string;
  content: TradeMonthlySynthesys;
};

const TradesMonthlyTable: FunctionComponent<TradesMonthlyTableProps> = ({
  title,
  content,
  ..._rest
}): React.ReactNode => {
  return (
    <TableContainer>
      <Table variant="simple" size="sm">
        <TableCaption>
          {title} ({Object.keys(content).length})
        </TableCaption>
        <Thead>
          <Tr>
            <Td>Month</Td>
            <Td>#</Td>
            <Td>Success</Td>
            <Td>Duration</Td>
            <Td>Min</Td>
            <Td>Average</Td>
            <Td>Max</Td>
            <Td>PnL</Td>
          </Tr>
        </Thead>
        <Tbody>
          {Object.keys(content)
            .sort((a: string, b: string) => b.localeCompare(a))
            .map((key) => (
              <Tr key={key}>
                <Td>
                  <Link to={`../../month/${key.substring(0, 4)}/${key.substring(5)}`} as={RouterLink}>
                    {key}
                  </Link>
                </Td>
                <Td isNumeric>{content[key].count}</Td>
                <Td isNumeric>{formatNumber((content[key].success / content[key].count) * 100)}%</Td>
                <Td isNumeric>{formatNumber(content[key].duration / content[key].count)}</Td>
                <Td>
                  <Number value={content[key].min} />
                </Td>
                <Td>
                  <Number value={content[key].total / content[key].count} />
                </Td>
                <Td>
                  <Number value={content[key].max} />
                </Td>
                <Td>
                  <Number value={content[key].total} />
                </Td>
              </Tr>
            ))}
        </Tbody>
        <Tfoot>
          <Tr>
            <Td fontWeight="bold">Total</Td>
            <Td isNumeric fontWeight="bold">
              {Object.values(content).reduce((p: number, v) => (p += v.count || 0), 0)}
            </Td>
            <Td isNumeric fontWeight="bold">
              {formatNumber(
                (Object.values(content).reduce((p: number, v) => (p += v.success || 0), 0) /
                  Object.values(content).reduce((p: number, v) => (p += v.count || 0), 0)) *
                  100,
              )}
              %
            </Td>
            <Td isNumeric fontWeight="bold">
              {formatNumber(
                Object.values(content).reduce((p: number, v) => (p += v.duration || 0), 0) /
                  Object.values(content).reduce((p: number, v) => (p += v.count || 0), 0),
              )}
            </Td>
            <Td>
              <Number
                value={Object.values(content).reduce((p: number, v) => (p ? Math.min(p, v.min) : v.min), undefined)}
              />
            </Td>
            <Td>
              <Number
                value={
                  Object.values(content).reduce((p: number, v) => (p += v.total || 0), 0) /
                  Object.values(content).reduce((p: number, v) => (p += v.count || 0), 0)
                }
                fontWeight="bold"
              />
            </Td>
            <Td>
              <Number
                value={Object.values(content).reduce((p: number, v) => (p ? Math.max(p, v.max) : v.max), undefined)}
              />
            </Td>
            <Td>
              <Number
                value={Object.values(content).reduce((p: number, v) => (p += v.total || 0), 0)}
                fontWeight="bold"
              />
            </Td>
          </Tr>
        </Tfoot>
      </Table>
    </TableContainer>
  );
};

export default TradesMonthlyTable;
