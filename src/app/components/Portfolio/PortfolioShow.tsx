import { DeleteIcon, EditIcon } from "@chakra-ui/icons";
import { Center, Flex, Text } from "@chakra-ui/layout";
import React, { FunctionComponent } from "react";
import { Link as RouterLink, useLoaderData } from "react-router-dom";
import { Portfolio as PortfolioModel } from "../../../models/portfolio.model";
import { obfuscate } from "../../utils";
import PortfolioLayout from "./PortfolioLayout";

type PortfolioShowProps = Record<string, never>;

const PortfolioShow: FunctionComponent<PortfolioShowProps> = ({ ..._rest }): JSX.Element => {
  // const { portfolioId } = useParams();
  // const [thisPortfolio, setPortfolio] = useState({} as PortfolioModel);
  const thisPortfolio = useLoaderData() as PortfolioModel;

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
    </PortfolioLayout>
  );
};

export default PortfolioShow;
