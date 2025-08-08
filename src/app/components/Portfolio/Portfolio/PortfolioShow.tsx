import { Flex, IconButton, Text, VStack } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";
import { LuPencil as EditIcon } from "react-icons/lu";
import { Link as RouterLink, useLoaderData } from "react-router-dom";
import { cashStrategy2String } from "../../../../models/types";
import { obfuscate } from "../../../utils";
import SettingsTable from "../Setting/SettingsTable";
import { portfolioLoader } from "./loaders";

type PortfolioShowProps = Record<string, never>;

const PortfolioShow: FunctionComponent<PortfolioShowProps> = ({ ..._rest }): React.ReactNode => {
  const thisPortfolio = useLoaderData<typeof portfolioLoader>();

  return (
    <VStack>
      <Flex justifyContent="center" gap="2">
        <Text w="150px" as="b" textAlign="right">
          Portfolio Id:
        </Text>
        <Text textAlign="left" w="120px">
          {thisPortfolio.id}
        </Text>
      </Flex>
      <Flex justifyContent="center" gap="2">
        <Text w="150px" as="b" textAlign="right">
          Name:
        </Text>
        <Text w="120px" textAlign="left">
          {thisPortfolio.name}
        </Text>
      </Flex>
      <Flex justifyContent="center" gap="2">
        <Text w="150px" as="b" textAlign="right">
          Account:
        </Text>
        <Text w="120px" textAlign="left">
          {obfuscate(thisPortfolio.account)}
        </Text>
      </Flex>
      <Flex justifyContent="center" gap="2">
        <Text w="150px" as="b" textAlign="right">
          Currency:
        </Text>
        <Text w="120px" textAlign="left">
          {thisPortfolio.baseCurrency}
        </Text>
      </Flex>

      {thisPortfolio.benchmark && (
        <>
          <Flex justifyContent="center" gap="2">
            <Text w="150px" as="b" textAlign="right">
              Cash contract:
            </Text>
            <Text w="120px" textAlign="left">
              {thisPortfolio.benchmark.symbol}
            </Text>
          </Flex>
          <Flex justifyContent="center" gap="2">
            <Text w="150px" as="b" textAlign="right">
              Cash strategy:
            </Text>
            <Text w="120px" textAlign="left">
              {cashStrategy2String(thisPortfolio.cashStrategy)}
            </Text>
          </Flex>
          <Flex justifyContent="center" gap="2">
            <Text w="150px" as="b" textAlign="right">
              Min buy units:
            </Text>
            <Text w="120px" textAlign="left">
              {thisPortfolio.minBenchmarkUnits}
            </Text>
          </Flex>
        </>
      )}

      <Flex justifyContent="center" gap="2" mt="1">
        <IconButton aria-label="Edit" variant="ghost" asChild>
          <RouterLink to="edit">
            <EditIcon />
          </RouterLink>
        </IconButton>
      </Flex>

      <SettingsTable content={thisPortfolio.settings} />
    </VStack>
  );
};

export default PortfolioShow;
