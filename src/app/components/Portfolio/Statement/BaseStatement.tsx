import { Flex, Link, Text } from "@chakra-ui/react";
import { default as React } from "react";
import { Link as RouterLink } from "react-router-dom";
import { StatementEntry } from "../../../../routers/statements.types";
import { ContractLink } from "../Contract/links";
import { StatementLink } from "../Statement/links";
import { TradeLink } from "../Trade/links";

type Props = { portfolioId: number; statement: StatementEntry };

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
          <Link to={StatementLink.toDate(portfolioId, new Date(statement.date))} as={RouterLink}>
            {new Date(statement.date).toLocaleString()}
          </Link>
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
          <Link to={TradeLink.toItem(portfolioId, statement.trade_id)} as={RouterLink}>
            {statement.trade_id}
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
      {"underlying" in statement && (
        <Flex justifyContent="center" gap="2">
          <Text w="110px" as="b" textAlign="right">
            Underlying:
          </Text>
          <Text w="200px" textAlign="right">
            <Link to={ContractLink.toItem(portfolioId, statement.underlying.id)} as={RouterLink}>
              {statement.underlying.symbol}
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
