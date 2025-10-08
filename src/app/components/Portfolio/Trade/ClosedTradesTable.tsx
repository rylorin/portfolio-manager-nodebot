import { Link, Table, TableCaption } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";
import { Link as RouterLink, useLoaderData, useParams } from "react-router-dom";
import { TradeEntry } from "../../../../routers/trades.types";
import { formatNumber } from "../../../utils";
import Number from "../../Number/Number";
import { ContractLink } from "../Contract/links";
import { TradeLink } from "./links";
import { tradeStatus2String, tradeStrategy2String } from "./utils";

interface Props {
  title?: string;
  content?: TradeEntry[];
}

/**
 * Closed trades table
 * @param param0
 * @returns
 */
const TradesTable: FunctionComponent<Props> = ({ title = "Trades index", content, ..._rest }): React.ReactNode => {
  const { portfolioId } = useParams();
  const theTrades = content || (useLoaderData() as TradeEntry[]);

  return (
    <>
      <Table.Root variant="line" size="sm">
        <TableCaption>
          {title} ({theTrades.length})
        </TableCaption>
        <Table.Header>
          <Table.Row>
            <Table.Cell>Id</Table.Cell>
            <Table.Cell>Symbol</Table.Cell>
            <Table.Cell>Strategy</Table.Cell>
            <Table.Cell>Open</Table.Cell>
            <Table.Cell>Closed</Table.Cell>
            <Table.Cell>Status</Table.Cell>
            <Table.Cell>Days</Table.Cell>
            <Table.Cell>Engaged</Table.Cell>
            <Table.Cell>PnL</Table.Cell>
            <Table.Cell>APR</Table.Cell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {theTrades
            .sort((a, b) => (a.closingDate ? b.closingDate - a.closingDate : b.openingDate - a.openingDate))
            .map((item) => (
              <Table.Row key={item.id}>
                <Table.Cell>
                  <Link asChild>
                    <RouterLink to={TradeLink.toItem(portfolioId, item.id)}>{item.id}</RouterLink>
                  </Link>
                </Table.Cell>
                <Table.Cell>
                  <Link asChild>
                    <RouterLink to={ContractLink.toItem(portfolioId, item.underlying.id)}>
                      {item.underlying.symbol}
                    </RouterLink>
                  </Link>
                </Table.Cell>
                <Table.Cell>{tradeStrategy2String(item.strategy)}</Table.Cell>
                <Table.Cell>{new Date(item.openingDate).toLocaleDateString()}</Table.Cell>
                <Table.Cell>
                  {item.closingDate ? new Date(item.closingDate).toLocaleDateString() : undefined}
                </Table.Cell>
                <Table.Cell>{tradeStatus2String(item.status)}</Table.Cell>
                <Table.Cell textAlign="end">{formatNumber(item.duration)}</Table.Cell>
                <Table.Cell textAlign="end">{formatNumber(item.risk)}</Table.Cell>
                <Table.Cell textAlign="end">
                  <Number value={item.pnlInBase} />
                </Table.Cell>
                <Table.Cell textAlign="end">
                  <Number value={item.apy} decimals={1} isPercent />
                </Table.Cell>
              </Table.Row>
            ))}
        </Table.Body>
        <Table.Footer>
          <Table.Row fontWeight="bold">
            <Table.Cell>Total</Table.Cell>
            <Table.Cell></Table.Cell>
            <Table.Cell></Table.Cell>
            <Table.Cell></Table.Cell>
            <Table.Cell></Table.Cell>
            <Table.Cell></Table.Cell>
            <Table.Cell></Table.Cell>
            <Table.Cell></Table.Cell>
            <Table.Cell textAlign="end">
              <Number value={theTrades.reduce((p: number, item) => (p += item.pnlInBase || 0), 0)} />
            </Table.Cell>
            <Table.Cell></Table.Cell>
          </Table.Row>
        </Table.Footer>
      </Table.Root>
    </>
  );
};

export default TradesTable;
