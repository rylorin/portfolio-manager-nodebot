import { Flex, Text } from "@chakra-ui/react";
import { default as React } from "react";
import { DividendStatementEntry } from "../../../../routers/statements.types";

type Props = { portfolioId: number; statement: DividendStatementEntry };

const DividendStatementProps = ({ statement, ..._rest }: Props): React.ReactNode => {
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

export default DividendStatementProps;
