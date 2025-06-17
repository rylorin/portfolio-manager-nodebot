import { Flex, Link, Text } from "@chakra-ui/react";
import { default as React } from "react";
import { Link as RouterLink } from "react-router-dom";
import { StatementEntry } from "../../../../routers/statements.types";
import { ContractLink } from "../Contract/links";
import { StatementLink } from "../Statement/links";
import { TradeLink } from "../Trade/links";

interface Props {
  portfolioId: number;
  statement: StatementEntry;
}

const BaseStatement = ({ portfolioId, statement }: Props): React.ReactNode => {
  return (
    <>
      <Flex justifyContent="center" gap="2">
        <Text w="110px" as="b" textAlign="right">
          Statement Id:
        </Text>
        <Text w="200px" textAlign="right">
          {statement.id}
        </Text>
      </Flex>
      <Flex justifyContent="center" gap="2">
        <Text w="110px" as="b" textAlign="right">
          Transaction:
        </Text>
        <Text w="200px" textAlign="right">
          {statement.transactionId}
        </Text>
      </Flex>
      <Flex justifyContent="center" gap="2">
        <Text w="110px" as="b" textAlign="right">
          Date:
        </Text>
        <Text w="200px" textAlign="right">
          <Link asChild>
            <RouterLink to={StatementLink.toDate(portfolioId, new Date(statement.date))}>
              {new Date(statement.date).toLocaleString()}
            </RouterLink>
          </Link>
        </Text>
      </Flex>
      <Flex justifyContent="center" gap="2">
        <Text w="110px" as="b" textAlign="right">
          Net cash:
        </Text>
        <Text w="200px" textAlign="right">
          {statement.amount}
        </Text>
      </Flex>
      <Flex justifyContent="center" gap="2">
        <Text w="110px" as="b" textAlign="right">
          Currency:
        </Text>
        <Text w="200px" textAlign="right">
          {statement.currency}
        </Text>
      </Flex>
      <Flex justifyContent="center" gap="2">
        <Text w="110px" as="b" textAlign="right">
          Trade:
        </Text>
        <Text w="200px" textAlign="right">
          <Link asChild>
            <RouterLink to={TradeLink.toItem(portfolioId, statement.trade_id)}>{statement.trade_id}</RouterLink>
          </Link>
        </Text>
      </Flex>
      <Flex justifyContent="center" gap="2">
        <Text w="110px" as="b" textAlign="right">
          Fx Rate:
        </Text>
        <Text w="200px" textAlign="right">
          {statement.fxRateToBase}
        </Text>
      </Flex>
      {"underlying" in statement && statement.underlying && (
        <Flex justifyContent="center" gap="2">
          <Text w="110px" as="b" textAlign="right">
            Underlying:
          </Text>
          <Text w="200px" textAlign="right">
            <Link asChild>
              <RouterLink to={ContractLink.toItem(portfolioId, statement.underlying.id)}>
                {statement.underlying.symbol}
              </RouterLink>
            </Link>
          </Text>
        </Flex>
      )}
      <Flex justifyContent="center" gap="2">
        <Text w="110px" as="b" textAlign="right">
          Type:
        </Text>
        <Text w="200px" textAlign="right">
          {statement.statementType}
        </Text>
      </Flex>
      <Flex justifyContent="center" gap="2">
        <Text w="110px" as="b" textAlign="right">
          Description:
        </Text>
        <Text w="200px" textAlign="right">
          {statement.description}
        </Text>
      </Flex>
    </>
  );
};

export default BaseStatement;
