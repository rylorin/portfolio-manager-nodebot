import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Flex,
  Text,
  VStack,
} from "@chakra-ui/react";
import React, { FunctionComponent } from "react";
import { useLoaderData, useParams } from "react-router-dom";
import { PositionEntry } from "../../../../routers/positions.types";
import { TradeEntry } from "../../../../routers/trades.types";
import PositionsTable from "../Position/PositionsTable";
import CommentBox from "./CommentBox";
import PerformanceBox from "./PerformanceBox";
import StatusBox from "./StatusBox";
import SymbolBox from "./SymbolBox";
import TitleBox from "./TitleBox";

type Props = {
  title?: string;
  content?: TradeEntry[];
};

/**
 * Trade table with decorations
 */
const TradesTable: FunctionComponent<Props> = ({ title = "Trades index", content, ..._rest }): React.ReactNode => {
  const { _portfolioId } = useParams();
  const theTrades = content || (useLoaderData() as TradeEntry[]);

  return (
    <>
      <VStack>
        <Text>
          {title} ({theTrades.length})
        </Text>
        <Accordion allowMultiple>
          {theTrades.map((item) => (
            <AccordionItem>
              <VStack w="100%" key={`trade${item.id}`} as="h2">
                <AccordionButton>
                  <Flex
                    w="100%"
                    borderWidth="1px"
                    borderRadius="lg"
                    p={1}
                    wrap="wrap"
                    alignItems="botton"
                    fontSize="sm"
                  >
                    <TitleBox item={item} />
                    <StatusBox item={item} />
                    <SymbolBox item={item} />
                    <PerformanceBox item={item} />
                    <CommentBox item={item} />
                  </Flex>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel>
                  {/* {item.positions?.length > 0 && <PositionsTable content={item.positions} />} */}
                  {item.virtuals?.length > 0 && (
                    <PositionsTable
                      content={item.virtuals.filter((pos) => pos.quantity) as PositionEntry[]}
                      title="Virtual positions"
                      currency={item.currency}
                    />
                  )}
                </AccordionPanel>
              </VStack>
            </AccordionItem>
          ))}
        </Accordion>
      </VStack>
    </>
  );
};

export default TradesTable;
