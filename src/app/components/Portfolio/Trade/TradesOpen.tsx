import { Box, Link, Spacer } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Link as RouterLink, useLoaderData, useParams } from "react-router-dom";
import { ContractType } from "../../../../models/contract.types";
import { OptionPositionEntry, PositionEntry } from "../../../../routers/positions.types";
import { TradeEntry } from "../../../../routers/trades.types";
import TradesTable from "./TradesTable3";

type Props = Record<string, never>;

const TradesOpen: FunctionComponent<Props> = ({ ..._rest }): React.ReactNode => {
  const { _portfolioId } = useParams();
  const theTrades = useLoaderData() as TradeEntry[];

  const getExpiration = (item: PositionEntry | OptionPositionEntry): string | undefined => {
    switch (item.contract.secType) {
      case ContractType.Stock:
        return undefined;
      case ContractType.Option:
      case ContractType.FutureOption: // Not implemented yet
        return (item as OptionPositionEntry).option.expiration;
      case ContractType.Future:
        return item.contract.expiration;
      default:
        throw Error("getExpiration: contract type not implemented!");
    }
  };

  const getSymbol = (item: PositionEntry | OptionPositionEntry): string | undefined => {
    switch (item.contract.secType) {
      case ContractType.Stock:
        return item.contract.symbol;
      case ContractType.Option:
      case ContractType.FutureOption: // Not implemented yet
        return (item as OptionPositionEntry).underlying.symbol;
      case ContractType.Future:
        return item.contract.symbol;
      default:
        throw Error("getSymbol: contract type not implemented!");
    }
  };

  const comparePositions = (a: PositionEntry | OptionPositionEntry, b: PositionEntry | OptionPositionEntry): number => {
    let result: number;

    // sort by expiration
    const aExpiration = getExpiration(a);
    const bExpiration = getExpiration(b);
    if (!aExpiration && !bExpiration) result = 0;
    else if (!aExpiration && bExpiration) result = +1;
    else if (aExpiration && !bExpiration) result = -1;
    else {
      // We have expiration dates both for a and for b
      result = aExpiration.localeCompare(bExpiration);
    }

    // then sort by symbol
    if (!result) {
      const aSymbol = getSymbol(a);
      const bSymbol = getSymbol(b);
      // console.log(a, b, aSymbol, bSymbol);
      result = aSymbol.localeCompare(bSymbol);
    }

    // then by contract type
    if (!result) {
      if (a.contract.secType != ContractType.Option && b.contract.secType == ContractType.Option) {
        // List future and stock positions before option position
        result = +1;
      } else if (a.contract.secType == ContractType.Option && b.contract.secType != ContractType.Option) {
        // List future and stock positions before option position
        result = -1;
      } else if (a.contract.secType == ContractType.Option && b.contract.secType == ContractType.Option) {
        // Sort options by strike
        result = (b as OptionPositionEntry).option.strike - (a as OptionPositionEntry).option.strike;
        if (result == 0) {
          if ((a as OptionPositionEntry).option.type == "C") result = 1;
          else result = -1;
        }
      } else if (a.contract.secType == b.contract.secType) {
        // We should not have 2 positions on the same asset, except for options
        console.error("comparePositions positions on the same asset", a, b);
      } else {
        console.error("comparePositions not implemented for", a, b);
      }
    }
    return result;
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
