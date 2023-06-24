import { ArrowBackIcon, CheckIcon } from "@chakra-ui/icons";
import { Center, Flex, Text } from "@chakra-ui/layout";
import React, { FunctionComponent } from "react";
import { Link as RouterLink, useLoaderData, useNavigate } from "react-router-dom";
import { Portfolio as PortfolioModel } from "../../../models/portfolio.model";
import { obfuscate } from "../../utils";
import PortfolioLayout from "./PortfolioLayout";

type PortfolioShowProps = Record<string, never>;

const PortfolioEdit: FunctionComponent<PortfolioShowProps> = ({ ..._rest }): JSX.Element => {
  const thisPortfolio = useLoaderData() as PortfolioModel;
  const navigate = useNavigate();

  return (
    <PortfolioLayout>
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
      <Flex justifyContent="center" gap="2" mt="1">
        <Center w="40px" h="40px">
          <ArrowBackIcon onClick={(): void => navigate(-1)} />
        </Center>
        <RouterLink to={`../${thisPortfolio.id}`}>
          <Center w="40px" h="40px">
            <CheckIcon />
          </Center>
        </RouterLink>
      </Flex>
    </PortfolioLayout>
  );
};

export default PortfolioEdit;
