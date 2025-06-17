import { HStack, Link, StackSeparator as StackDivider, Text, VStack } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { TradeMonthlyRow, TradeMonthlySynthesys, TradeMonthlySynthesysEntry } from "../../../../routers/trades.types";
import Number from "../../Number/Number";
import { TradeLink } from "./links";

interface TradesMonthlyTableProps {
  title?: string;
  content: TradeMonthlySynthesys;
}

interface minorRowProps {
  major: string;
  index: string;
  content: TradeMonthlySynthesysEntry;
}

const MinorRow: FunctionComponent<minorRowProps> = ({ major, index, content, ..._rest }): React.ReactNode => {
  const { portfolioId } = useParams();

  return (
    <HStack>
      <Text width="100px"></Text>
      <Text width="100px">
        <Link asChild>
          <RouterLink to={TradeLink.toClosedOpened(portfolioId, major, index)}>{index}</RouterLink>
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
  );
};

interface majorRowProps {
  index: string;
  content: TradeMonthlyRow;
}

const MajorRow: FunctionComponent<majorRowProps> = ({ index, content, ..._rest }): React.ReactNode => {
  const { portfolioId } = useParams();

  return (
    <>
      <HStack fontWeight="bold">
        <Text width="100px">
          <Link asChild>
            <RouterLink to={TradeLink.toClosedMonth(portfolioId, index)}>{index}</RouterLink>
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

interface totalRowProps {
  content: TradeMonthlySynthesys;
}

const TotalRow: FunctionComponent<totalRowProps> = ({ content, ..._rest }): React.ReactNode => {
  const totals: TradeMonthlySynthesysEntry = Object.keys(content).reduce(
    (p, item) => {
      const max =
        p.max == undefined ? (content[item]["-"].max as number) : Math.max(p.max, content[item]["-"].max as number);
      const min = p.min == undefined ? content[item]["-"].min : Math.min(p.min, content[item]["-"].min as number);
      return {
        count: p.count + content[item]["-"].count,
        success: p.success + content[item]["-"].success,
        duration: (p.duration += content[item]["-"].duration),
        min,
        max,
        total: p.total + content[item]["-"].total,
      };
    },
    {
      count: 0,
      success: 0,
      duration: 0,
      min: undefined,
      max: undefined,
      total: 0,
    } as TradeMonthlySynthesysEntry,
  );
  return (
    <HStack fontWeight="bold">
      <Text width="100px">Total</Text>
      <Text width="100px"></Text>
      <Number value={totals.count} color="-" width="100px" />
      <Number value={totals.success / totals.count} isPercent color="-" width="100px" />
      <Number value={totals.duration / totals.count} color="-" width="100px" />
      <Number value={totals.min} width="100px" />
      <Number value={totals.total / totals.count} width="100px" />
      <Number value={totals.max} width="100px" />
      <Number value={totals.total} width="100px" />
    </HStack>
  );
};

const TradesMonthlyTable: FunctionComponent<TradesMonthlyTableProps> = ({
  title = "Closed trades by month",
  content,
  ..._rest
}): React.ReactNode => {
  return (
    <VStack separator={<StackDivider borderColor="gray.200" />}>
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
      <TotalRow content={content} />
      <Text>
        {title} ({Object.keys(content).length})
      </Text>
    </VStack>
  );
};

export default TradesMonthlyTable;
