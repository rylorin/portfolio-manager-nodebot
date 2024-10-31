import { HStack, Link, Text, VStack } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";
import { Link as RouterLink } from "react-router-dom";
import { TradeMonthlyRow, TradeMonthlySynthesys, TradeMonthlySynthesysEntry } from "../../../../routers/trades.types";
import Number from "../../Number/Number";

type TradesMonthlyTableProps = {
  content: TradeMonthlySynthesys;
};

type minorRowProps = {
  major: string;
  index: string;
  content: TradeMonthlySynthesysEntry;
};

const MinorRow: FunctionComponent<minorRowProps> = ({ major, index, content, ..._rest }): React.ReactNode => {
  console.log("MinorRow", index, content);
  return (
    <>
      <HStack>
        <Text width="100px"></Text>
        <Text width="100px">
          <Link to={`../../month/${major.substring(0, 4)}/${major.substring(5)}`} as={RouterLink}>
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
  console.log("MajorRow", index, content);
  return (
    <>
      <HStack>
        <Text width="100px">
          <Link to={`../../month/${index.substring(0, 4)}/${index.substring(5)}`} as={RouterLink}>
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

const TradesMonthlyTable: FunctionComponent<TradesMonthlyTableProps> = ({ content, ..._rest }): React.ReactNode => {
  console.log("TradesMonthlyTable", content);
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
      </VStack>
    </>
  );
};

export default TradesMonthlyTable;
