import { Box, Link, Spacer } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Link as RouterLink, useLoaderData, useParams } from "react-router-dom";
import { TradeEntry } from "../../../../routers/trades.types";
import TradesTable from "./OpenTradesTable";

type Props = Record<string, never>;

/**
 * Open trades component
 * @param param0
 * @returns
 */
const TradesOpen: FunctionComponent<Props> = ({ ..._rest }): React.ReactNode => {
  const { _portfolioId } = useParams();
  const theTrades = useLoaderData() as TradeEntry[];

  const compareTrades = (a: TradeEntry, b: TradeEntry): number => {
    let result: number;
    const dateA = a.closingDate ? a.closingDate : new Date(a.expectedExpiry).getTime();
    const dateB = b.closingDate ? b.closingDate : new Date(b.expectedExpiry).getTime();
    if (dateA && dateB) result = dateA - dateB;
    else if (dateA && !dateB) result = -1;
    else if (!dateA && dateB) result = 1;
    else result = 0;
    if (!result) result = a.underlying.symbol.localeCompare(b.underlying.symbol);
    return result;
  };

  const sortTrades = (trades: TradeEntry[]): TradeEntry[] => {
    // trades.forEach((trade) => {
    //   trade.positions = trade.positions.sort(comparePositions);
    // });
    return trades.sort(compareTrades);
  };

  return (
    <>
      <Box>
        <Spacer />
        <Link to={"../open"} as={RouterLink}>
          Open
        </Link>
        {" | "}
        <Link to={"../ytd"} as={RouterLink}>
          YTD
        </Link>
        {" | "}
        <Link to={"../12m"} as={RouterLink}>
          12M
        </Link>
        {" | "}
        <Link to={"../all"} as={RouterLink}>
          All
        </Link>
        <Spacer />
      </Box>
      <TradesTable content={sortTrades(theTrades)} title="Open trades" />
    </>
  );
};

export default TradesOpen;
