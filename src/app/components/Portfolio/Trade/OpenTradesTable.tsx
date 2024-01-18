import { Link, Table, TableCaption, TableContainer, Tbody, Td, Tfoot, Thead, Tr } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";
import { Link as RouterLink, useLoaderData, useParams } from "react-router-dom";
import { TradeEntry } from "../../../../routers/trades.types";
import { formatNumber } from "../../../utils";
import Number from "../../Number/Number";
import { ContractLink } from "../Contract/links";
import { TradeLink } from "./links";
import { tradeStrategy2String } from "./utils";

type Props = {
  title?: string;
  content?: TradeEntry[];
};

/**
 * Open trades tables
 * @param param0
 * @returns
 */
const TradesTable: FunctionComponent<Props> = ({ title = "Trades index", content, ..._rest }): React.ReactNode => {
  const { portfolioId } = useParams();
  const theTrades = content || (useLoaderData() as TradeEntry[]);

  return (
    <TableContainer>
      <Table variant="simple" size="sm">
        <TableCaption>
          {title} ({theTrades.length})
        </TableCaption>
        <Thead>
          <Tr>
            <Td>Id</Td>
            <Td>Symbol</Td>
            <Td>Strategy</Td>
            <Td>Open</Td>
            <Td>Expiration</Td>
            <Td>Days</Td>
            <Td>Risk</Td>
            <Td>PnL</Td>
            <Td>APY</Td>
          </Tr>
        </Thead>
        <Tbody>
          {theTrades.map((item) => (
            <Tr key={item.id}>
              <Td>
                {item.id > 0 && (
                  <Link to={TradeLink.toItem(portfolioId, item.id)} as={RouterLink}>
                    {item.id}
                  </Link>
                )}
              </Td>
              <Td>
                <Link to={ContractLink.toItem(portfolioId, item.underlying.id)} as={RouterLink}>
                  {item.underlying.symbol}
                </Link>
              </Td>
              <Td>{tradeStrategy2String(item.strategy)}</Td>
              <Td>{new Date(item.openingDate).toLocaleDateString()}</Td>
              <Td>{item.expectedExpiry && new Date(item.expectedExpiry).toLocaleDateString()}</Td>
              <Td isNumeric>{formatNumber(item.expectedDuration)}</Td>
              <Td isNumeric>{formatNumber(item.risk)}</Td>
              <Td isNumeric>
                <Number value={item.pnlInBase} />
              </Td>
              <Td isNumeric>
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
            <Td isNumeric>
              <Number value={theTrades.reduce((p: number, item) => (p += item.risk || 0), 0)} />
            </Td>
            <Td isNumeric>
              <Number value={theTrades.reduce((p: number, item) => (p += item.pnlInBase || 0), 0)} />
            </Td>
            <Td></Td>
          </Tr>
        </Tfoot>
      </Table>
    </TableContainer>
  );
};

export default TradesTable;
