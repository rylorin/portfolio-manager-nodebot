import { Flex, Text } from "@chakra-ui/react";
import { default as React } from "react";
import { BondStatementEntry } from "../../../../routers/statements.types";

type Props = { portfolioId: number; statement: BondStatementEntry };

const BondStatementProps = ({ statement, ..._rest }: Props): React.ReactNode => {
  return (
    <>
      <Flex justifyContent="center" gap="2">
        <Text w="110px" as="b" textAlign="right">
          Country:
        </Text>
        <Text w="200px" textAlign="right">
          {statement.country}
        </Text>
      </Flex>
      <Flex justifyContent="center" gap="2">
        <Text w="110px" as="b" textAlign="right">
          Accrued int.:
        </Text>
        <Text w="200px" textAlign="right">
          {statement.accruedInterests}
        </Text>
      </Flex>
      <Flex justifyContent="center" gap="2">
        <Text w="110px" as="b" textAlign="right">
          PnL:
        </Text>
        <Text w="200px" textAlign="right">
          {statement.pnl}
        </Text>
      </Flex>
    </>
  );
};

export default BondStatementProps;
