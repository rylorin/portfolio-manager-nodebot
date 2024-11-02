import { HStack, Link, Text, VStack } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { TradeMonthlyRow, TradeMonthlySynthesys, TradeMonthlySynthesysEntry } from "../../../../routers/trades.types";
import Number from "../../Number/Number";
import { TradeLink } from "./links";

type TradesMonthlyTableProps = {
  title?: string;
  content: TradeMonthlySynthesys;
};

type minorRowProps = {
  major: string;
  index: string;
  content: TradeMonthlySynthesysEntry;
};

const MinorRow: FunctionComponent<minorRowProps> = ({ major, index, content, ..._rest }): React.ReactNode => {
  const { portfolioId } = useParams();

  return (
    <>
      <HStack>
        <Text width="100px"></Text>
        <Text width="100px">
          <Link to={TradeLink.toClosedOpened(portfolioId, major, index)} as={RouterLink}>
            {index}
          </Link>
        </Text>
        <Number value={content.count} color="-" width="100px" />
        <Number value={content.success / content.count} isPercent color="-" width="100px" />
        <Number value={content.duration / content.count} color="-" width="100px" />
        <Number value={content.min} width="100px" />
        <Number value={content.total / content.count} width="100px" />
        <Number value={content.max} width="100px" />
        <Number value={content.total} width="100px" />
      </HStack>
    </>
  );
};

type majorRowProps = {
  index: string;
  content: TradeMonthlyRow;
};

const MajorRow: FunctionComponent<majorRowProps> = ({ index, content, ..._rest }): React.ReactNode => {
  const { portfolioId } = useParams();

  return (
    <>
      <HStack>
        <Text width="100px">
          <Link to={TradeLink.toClosedMonth(portfolioId, index)} as={RouterLink}>
            {index}
          </Link>
        </Text>
        <Text width="100px"></Text>
        <Number value={content["-"].count} color="-" width="100px" />
        <Number value={content["-"].success / content["-"].count} isPercent color="-" width="100px" />
        <Number value={content["-"].duration / content["-"].count} color="-" width="100px" />
        <Number value={content["-"].min} width="100px" />
        <Number value={content["-"].total / content["-"].count} width="100px" />
        <Number value={content["-"].max} width="100px" />
        <Number value={content["-"].total} width="100px" />
      </HStack>
      {Object.keys(content)
        .sort((a: string, b: string) => b.localeCompare(a))
        .filter((index) => index !== "-")
        .map((subIndex) => (
          <MinorRow key={subIndex} major={index} index={subIndex} content={content[subIndex]} />
        ))}
    </>
  );
};

const TradesMonthlyTable: FunctionComponent<TradesMonthlyTableProps> = ({
  title = "Closed trades by month",
  content,
  ..._rest
}): React.ReactNode => {
  return (
    <>
      <VStack>
        <HStack>
          <Text width="100px" align="center">
            Close
          </Text>
          <Text width="100px" align="center">
            Open
          </Text>
          <Text width="100px" align="center">
            #
          </Text>
          <Text width="100px" align="center">
            Success
          </Text>
          <Text width="100px" align="center">
            Duration
          </Text>
          <Text width="100px" align="center">
            Min
          </Text>
          <Text width="100px" align="center">
            Average
          </Text>
          <Text width="100px" align="center">
            Max
          </Text>
          <Text width="100px" align="center">
            PnL
          </Text>
        </HStack>
        {Object.keys(content)
          .sort((a: string, b: string) => b.localeCompare(a))
          .map((index) => (
            <MajorRow key={index} index={index} content={content[index]} />
          ))}
        <Text>
          {title} ({Object.keys(content).length})
        </Text>
      </VStack>
    </>
  );
};

export default TradesMonthlyTable;
