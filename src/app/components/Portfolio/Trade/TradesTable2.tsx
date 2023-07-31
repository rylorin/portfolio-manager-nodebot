import { Badge, Box, Link, Text, Tooltip, VStack } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";
import { Link as RouterLink, useLoaderData, useParams } from "react-router-dom";
import { TradeStatus } from "../../../../models/trade.types";
import { TradeEntry } from "../../../../routers/trades.types";
import { formatNumber } from "../../../utils";
import Number from "../../Number/Number";
import PositionsTable from "../Position/PositionsTable";
import { TradeLink } from "./links";
import { tradeStatus2String, tradeStrategy2String } from "./utils";

type Props = {
  title?: string;
  content?: TradeEntry[];
};

const TradesTable: FunctionComponent<Props> = ({ title = "Trades index", content, ..._rest }): JSX.Element => {
  const { portfolioId } = useParams();
  const theTrades = content || (useLoaderData() as TradeEntry[]);

  const statusBadgetColor = (status): string => {
    switch (status) {
      case TradeStatus.open:
        return "teal";
      case TradeStatus.closed:
        return "pink";
      default:
        return "gray";
    }
  };

  return (
    <VStack>
      <Text>
        {title} ({theTrades.length})
      </Text>
      {theTrades.map((item) => (
        //   <TradeRow portfolioId={parseInt(portfolioId)} item={item} key={`trade${item.id}`} />
        <Box key={`trade${item.id}`} maxW="sm" borderWidth="1px" borderRadius="lg" overflow="hidden" p={1}>
          {item.id < 0 && <Text>Orphan positions</Text>}
          {item.id > 0 && (
            <Text>
              <Link to={TradeLink.toItem(portfolioId, item.id)} as={RouterLink}>
                Trade #{item.id}
              </Link>
            </Text>
          )}

          <Box display="flex" alignItems="baseline">
            <Badge borderRadius="full" px="2" colorScheme={statusBadgetColor(item.status)} variant="outline">
              {tradeStatus2String(item.status)}
            </Badge>
            <Text fontWeight="semibold" letterSpacing="wide" fontSize="xs" textTransform="uppercase" ml="2">
              {formatNumber(item.duration)} days
            </Text>
            <Box
              color="gray.500"
              fontWeight="semibold"
              letterSpacing="wide"
              fontSize="xs"
              textTransform="uppercase"
              ml="2"
            >
              &bull;{" "}
              <Tooltip label={new Date(item.openingDate).toLocaleString()} hasArrow={true}>
                {new Date(item.openingDate).toLocaleDateString()}
              </Tooltip>
              {item.closingDate && (
                <>
                  {" "}
                  &bull;{" "}
                  <Tooltip label={new Date(item.closingDate).toLocaleString()} hasArrow={true}>
                    {new Date(item.closingDate).toLocaleDateString()}
                  </Tooltip>
                </>
              )}
            </Box>
          </Box>

          <Box display="flex" alignItems="baseline">
            <Badge borderRadius="full" px="2" colorScheme="teal">
              {item.underlying.symbol}
            </Badge>
            <Box
              color="gray.500"
              fontWeight="semibold"
              letterSpacing="wide"
              fontSize="xs"
              textTransform="uppercase"
              ml="2"
            >
              {item.currency}
              {item.strategy && (
                <>
                  {" "}
                  &bull; {tradeStrategy2String(item.strategy)} ({item.strategy})
                </>
              )}
              {item.risk && (
                <>
                  {" "}
                  &bull; Risk <Number value={item.risk} />
                </>
              )}
            </Box>
          </Box>

          <Text>
            P&L: <Number value={item.pnl} /> (<Number value={item.pnlInBase} />)
          </Text>
          <Text>
            APY: <Number value={item.apy} isPercent />
          </Text>

          <Text>Notes: {item.comment}</Text>

          {item.positions && item.positions.length && <PositionsTable content={item.positions} />}
        </Box>
      ))}
    </VStack>
  );
};

export default TradesTable;
