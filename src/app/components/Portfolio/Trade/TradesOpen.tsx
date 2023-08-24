import { Box, Link, Spacer } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Link as RouterLink, useLoaderData, useParams } from "react-router-dom";
import { ContractType } from "../../../../models/contract.types";
import { OptionPositionEntry, PositionEntry } from "../../../../routers/positions.types";
import { TradeEntry } from "../../../../routers/trades.types";
import TradesTable from "./TradesTable2";

type Props = Record<string, never>;

const TradesOpen: FunctionComponent<Props> = ({ ..._rest }): JSX.Element => {
  const { _portfolioId } = useParams();
  const theTrades = useLoaderData() as TradeEntry[];

  const getExpiration = (item: PositionEntry | OptionPositionEntry): string | undefined => {
    switch (item.contract.secType) {
      case ContractType.Stock:
        return undefined;
      case ContractType.Option:
      case ContractType.FutureOption:
        return (item as OptionPositionEntry).option.expiration;
      case ContractType.Future:
        return item.contract.expiration;
      default:
        throw Error("getExpiration: contract type not implemented!");
    }
  };

  const comparePositions = (a: PositionEntry | OptionPositionEntry, b: PositionEntry | OptionPositionEntry): number => {
    let result: number;
    const aExpiration = getExpiration(a);
    const bExpiration = getExpiration(b);
    if (!aExpiration && !bExpiration) return a.contract.symbol.localeCompare(b.contract.symbol);
    else if (!aExpiration) return +1;
    else if (!bExpiration) return -1;
    else {
      result = aExpiration.localeCompare(bExpiration);
      if (!result) {
        result = (a as OptionPositionEntry).option.symbol.localeCompare((b as OptionPositionEntry).option.symbol);
        if (!result) result = (a as OptionPositionEntry).option.strike - (b as OptionPositionEntry).option.strike;
      }
      return result;
    }
  };

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
    trades.forEach((trade) => {
      trade.positions = trade.positions.sort(comparePositions);
    });
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
