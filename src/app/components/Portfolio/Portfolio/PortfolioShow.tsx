import { EditIcon } from "@chakra-ui/icons";
import { Flex, Text, VStack } from "@chakra-ui/layout";
import { IconButton } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";
import { Link as RouterLink, useLoaderData } from "react-router-dom";
import { obfuscate } from "../../../utils";
import SettingsTable from "../Setting/SettingsTable";
import { portfolioLoader } from "./loaders";

type PortfolioShowProps = Record<string, never>;

const PortfolioShow: FunctionComponent<PortfolioShowProps> = ({ ..._rest }): React.ReactNode => {
  const thisPortfolio = useLoaderData<typeof portfolioLoader>();

  return (
    <VStack>
      <Flex justifyContent="center" gap="2">
        <Text w="90px" as="b" textAlign="right">
          Id:
        </Text>
        <Text textAlign="left" w="120px">
          {thisPortfolio.id}
        </Text>
      </Flex>
      <Flex justifyContent="center" gap="2">
        <Text w="90px" as="b" textAlign="right">
          Name:
        </Text>
        <Text w="120px" textAlign="left">
          {thisPortfolio.name}
        </Text>
      </Flex>
      <Flex justifyContent="center" gap="2">
        <Text w="90px" as="b" textAlign="right">
          Account:
        </Text>
        <Text w="120px" textAlign="left">
          {obfuscate(thisPortfolio.account)}
        </Text>
      </Flex>
      <Flex justifyContent="center" gap="2">
        <Text w="90px" as="b" textAlign="right">
          Currency:
        </Text>
        <Text w="120px" textAlign="left">
          {thisPortfolio.baseCurrency}
        </Text>
      </Flex>
      {thisPortfolio.benchmark && (
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Cash:
          </Text>
          <Text w="120px" textAlign="left">
            {thisPortfolio.benchmark.symbol}
          </Text>
        </Flex>
      )}
      <Flex justifyContent="center" gap="2" mt="1">
        <IconButton aria-label="Edit" icon={<EditIcon />} variant="ghost" as={RouterLink} to="edit" />
      </Flex>

      <SettingsTable content={thisPortfolio.settings} />
    </VStack>
  );
};

export default PortfolioShow;
