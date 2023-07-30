import { Box, Link, Spacer, Text } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Link as RouterLink, useLoaderData } from "react-router-dom";
import { ContractType } from "../../../../models/contract.types";
import { TradeStatus, TradeStrategy } from "../../../../models/trade.types";
import { OptionPositionEntry, PositionEntry } from "../../../../routers/positions.types";
import { OpenTradesWithPositions, TradeEntry } from "../../../../routers/trades.types";
import TradesTable from "./TradesTable";

type Props = Record<string, never>;

const TradesOpen: FunctionComponent<Props> = ({ ..._rest }): JSX.Element => {
  const theSynthesys = useLoaderData() as OpenTradesWithPositions;

  const addFakeTrades = (theSynthesys: OpenTradesWithPositions): OpenTradesWithPositions => {
    theSynthesys.positions = theSynthesys.positions.filter((pos) => !pos.trade_id);
    while (theSynthesys.positions.length) {
      const underlying =
        "stock" in theSynthesys.positions[0]
          ? theSynthesys.positions[0].stock.symbol
          : theSynthesys.positions[0].contract.symbol;
      const currency = theSynthesys.positions[0].contract.currency;
      const positions = theSynthesys.positions.filter(
        (pos) => ("stock" in pos ? pos.stock.symbol : pos.contract.symbol) == underlying,
      );
      console.log("addFakeTrades", underlying, positions);
      theSynthesys.positions = theSynthesys.positions.filter(
        (pos) => ("stock" in pos ? pos.stock.symbol : pos.contract.symbol) !== underlying,
      );
      const id = positions.reduce((p, pos) => Math.min(p, -pos.id), 0);
      theSynthesys.trades.push({
        id,
        underlying: { symbol_id: 0, symbol: underlying },
        currency,
        openingDate: undefined,
        status: TradeStatus.open,
        closingDate: undefined,
        duration: undefined,
        strategy: TradeStrategy.undefined,
        risk: undefined,
        pnl: undefined,
        pnlInBase: undefined,
        apy: undefined,
        comment: undefined,
        statements: undefined,
        virtuals: undefined,
        positions,
      });
    }
    return theSynthesys;
  };

  const comparePositions = (a: PositionEntry | OptionPositionEntry, b: PositionEntry | OptionPositionEntry): number => {
    let result: number;
    if (a.contract.secType == ContractType.Stock && b.contract.secType == ContractType.Stock)
      return a.contract.symbol.localeCompare(b.contract.symbol);
    else if (a.contract.secType == ContractType.Stock) return +1;
    else if (b.contract.secType == ContractType.Stock) return -1;
    else if (a.contract.secType == ContractType.Option && b.contract.secType == ContractType.Option) {
      result = (a as OptionPositionEntry).option.expiration.localeCompare((b as OptionPositionEntry).option.expiration);
      if (!result) {
        result = (a as OptionPositionEntry).option.symbol.localeCompare((b as OptionPositionEntry).option.symbol);
        if (!result) result = (a as OptionPositionEntry).option.strike - (b as OptionPositionEntry).option.strike;
      }
      return result;
    } else throw Error("not implemented");
  };

  // Assume positions have been sorted in trades
  const compareTrades = (a: TradeEntry, b: TradeEntry): number => {
    if (!a.positions.length && b.positions.length) return +1;
    else if (a.positions.length && !b.positions.length) return -1;
    else if (!a.positions.length && !b.positions.length) return 0;
    else return comparePositions(a.positions[0], b.positions[0]);
  };

  const sortTrades = (theSynthesys: OpenTradesWithPositions): OpenTradesWithPositions => {
    theSynthesys.trades.forEach((trade) => {
      trade.positions = trade.positions.sort(comparePositions);
      // console.log(trade.positions);
    });
    theSynthesys.trades = theSynthesys.trades.sort(compareTrades);
    return theSynthesys;
  };

  // const extractTradesPositions = (trades: TradeEntry[]): (TradeEntry | PositionEntry)[] => {
  //   const result: (TradeEntry | PositionEntry)[] = [];
  //   return result;
  // };

  addFakeTrades(theSynthesys);
  sortTrades(theSynthesys);
  // const theTrades = extractTradesPositions(theSynthesys.trades);
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
      <Text>Open trades</Text>
      <TradesTable content={theSynthesys.trades} />
    </>
  );
};

export default TradesOpen;
