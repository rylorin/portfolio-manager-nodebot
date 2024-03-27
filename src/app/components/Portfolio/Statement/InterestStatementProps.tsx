import { Flex, Text } from "@chakra-ui/react";
import { default as React } from "react";
import { InterestStatementEntry } from "../../../../routers/statements.types";

type Props = { portfolioId: number; statement: InterestStatementEntry };

const InterestStatementProps = ({ statement, ..._rest }: Props): React.ReactNode => {
  return (
    <>
      <Flex justifyContent="center" gap="2">
        <Text w="90px" as="b" textAlign="right">
          Country:
        </Text>
        <Text w="200px" textAlign="right">
          {statement.country}
        </Text>
      </Flex>
    </>
  );
};

export default InterestStatementProps;
