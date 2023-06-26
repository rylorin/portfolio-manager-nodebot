import { ArrowBackIcon, DeleteIcon, EditIcon } from "@chakra-ui/icons";
import { Center, Flex, Text, VStack } from "@chakra-ui/layout";
import React, { FunctionComponent } from "react";
import { Link as RouterLink, useLoaderData, useNavigate } from "react-router-dom";
import { TradeEntry } from "../../../../routers/types";
import { formatNumber } from "../../../utils";
import Number from "../../Number/Number";
import { tradeStatus2String } from "../utils";

type TradeShowProps = Record<string, never>;

const TradeShow: FunctionComponent<TradeShowProps> = ({ ..._rest }): JSX.Element => {
  const thisTrade = useLoaderData() as TradeEntry;
  const navigate = useNavigate();

  return (
    <>
      <VStack>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Id:
          </Text>
          <Text textAlign="left" w="120px">
            {thisTrade.id}
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Open date:
          </Text>
          <Text textAlign="left" w="120px">
            {new Date(thisTrade.openingDate).toLocaleString()}
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Close date:
          </Text>
          <Text textAlign="left" w="120px">
            {thisTrade.closingDate && new Date(thisTrade.closingDate).toLocaleString()}
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Duration:
          </Text>
          <Text w="120px" textAlign="left">
            {formatNumber(thisTrade.duration)}
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Status:
          </Text>
          <Text textAlign="left" w="120px">
            {tradeStatus2String(thisTrade.status)}
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Strategy:
          </Text>
          <Text textAlign="left" w="120px">
            {thisTrade.strategyLabel}
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Symbol:
          </Text>
          <Text w="120px" textAlign="left">
            {thisTrade.symbol}
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Currency:
          </Text>
          <Text w="120px" textAlign="left">
            {thisTrade.currency}
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Risk:
          </Text>
          <Text w="120px" textAlign="left">
            <Number value={thisTrade.risk} />
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            P&L:
          </Text>
          <Text w="120px" textAlign="left">
            <Number value={thisTrade.pnl} />
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            APY:
          </Text>
          <Text w="120px" textAlign="left">
            <Number value={thisTrade.apy} isPercent />
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Notes:
          </Text>
          <Text w="120px" textAlign="left">
            {thisTrade.comment}
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2" mt="1">
          <Center w="40px" h="40px">
            <ArrowBackIcon onClick={(): void => navigate(-1)} />
          </Center>
          <RouterLink to="edit">
            <Center w="40px" h="40px">
              <EditIcon />
            </Center>
          </RouterLink>
          <RouterLink to="delete_but_edit">
            <Center w="40px" h="40px">
              <DeleteIcon />
            </Center>
          </RouterLink>
        </Flex>
      </VStack>
    </>
  );
};

export default TradeShow;
