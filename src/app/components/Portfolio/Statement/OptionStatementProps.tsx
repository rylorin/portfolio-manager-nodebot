import { Flex, Text } from "@chakra-ui/react";
import { default as React } from "react";
import { OptionStatementEntry } from "../../../../routers/statements.types";

interface Props {
  portfolioId: number;
  statement: OptionStatementEntry;
}

const OptionStatementProps = ({ statement, ..._rest }: Props): React.ReactNode => {
  return (
    <>
      <Flex justifyContent="center" gap="2">
        <Text w="110px" as="b" textAlign="right">
          Quantity:
        </Text>
        <Text w="200px" textAlign="right">
          {statement.quantity}
        </Text>
      </Flex>
    </>
  );
};

export default OptionStatementProps;
