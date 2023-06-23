import { Link, Table, TableCaption, TableContainer, Tbody, Td, Tfoot, Thead, Tr } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";
import { Link as RouterLink } from "react-router-dom";
import { TradeEntry } from "../../../../routers/types";
import { formatNumber } from "../../../utils";
import Number from "../../Number/Number";
import { tradeStatus2String } from "../utils";

type TradeSynthesysTableProps = {
  title?: string;
  content: TradeEntry[];
};

const TradeSynthesysTable: FunctionComponent<TradeSynthesysTableProps> = ({ title, content, ...rest }): JSX.Element => {
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
                <Td>{tradeStatus2String(item.status)}</Td>
                <Td isNumeric>{formatNumber(item.duration)}</Td>
                <Td isNumeric>{formatNumber(item.risk)}</Td>
                <Td>
                  <Number value={item.pnl} />
                </Td>
                <Td>
                  <Number value={item.apy * 100} decimals={1} />%
                </Td>
              </Tr>
            ))}
        </Tbody>
        <Tfoot>
          <Tr>
            <Td fontWeight="bold">Total</Td>
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

export default TradeSynthesysTable;
