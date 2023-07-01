import { Link, Table, TableCaption, TableContainer, Tbody, Td, Tfoot, Thead, Tr } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";
import { Link as RouterLink } from "react-router-dom";
import { TradeStatus } from "../../../../models/trade.types";
import { TradeEntry } from "../../../../routers/trades.types";
import { formatNumber } from "../../../utils";
import Number from "../../Number/Number";

type Props = {
  title?: string;
  content?: TradeEntry[];
};

const TradesIndex: FunctionComponent<Props> = ({ title = "Trades Index", content, ..._rest }): JSX.Element => {
  return (
    <TableContainer>
      <Table variant="simple" size="sm">
        <TableCaption>
          {title} ({content.length})
        </TableCaption>
        <Thead>
          <Tr>
            <Td>Id</Td>
            <Td>Symbol</Td>
            <Td>Strategy</Td>
            <Td>Open</Td>
            <Td>Closed</Td>
            <Td>Status</Td>
            <Td>Days</Td>
            <Td>Risk</Td>
            <Td>PnL</Td>
            <Td>APY</Td>
          </Tr>
        </Thead>
        <Tbody>
          {content
            .sort((a, b) => (a.closingDate ? b.closingDate - a.closingDate : b.openingDate - a.openingDate))
            .map((item) => (
              <Tr key={item.id}>
                <Td>
                  <Link to={`../../id/${item.id}/`} as={RouterLink}>
                    {item.id}
                  </Link>
                </Td>
                <Td>{item.symbol}</Td>
                <Td>{item.strategy}</Td>
                <Td>{new Date(item.openingDate).toLocaleDateString()}</Td>
                <Td>{item.closingDate ? new Date(item.closingDate).toLocaleDateString() : undefined}</Td>
                <Td>{TradeStatus[item.status]}</Td>
                <Td isNumeric>{formatNumber(item.duration)}</Td>
                <Td isNumeric>{formatNumber(item.risk)}</Td>
                <Td>
                  <Number value={item.pnl} />
                </Td>
                <Td>
                  <Number value={item.apy} decimals={1} isPercent />
                </Td>
              </Tr>
            ))}
        </Tbody>
        <Tfoot>
          <Tr fontWeight="bold">
            <Td>Total</Td>
            <Td></Td>
            <Td></Td>
            <Td></Td>
            <Td></Td>
            <Td></Td>
            <Td></Td>
            <Td></Td>
          </Tr>
        </Tfoot>
      </Table>
    </TableContainer>
  );
};

export default TradesIndex;