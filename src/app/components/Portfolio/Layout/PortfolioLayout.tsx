import { Box, Flex, Text } from "@chakra-ui/layout";
import { FunctionComponent, default as React, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Portfolio as PortfolioModel } from "../../../../models/portfolio.model";
import { obfuscate } from "../../../utils";
import SideBar from "../../NavBar/SideBar";
import { links } from "./links";

type PortfolioLayoutProps = {
  children: React.ReactNode;
};

const PortfolioLayout: FunctionComponent<PortfolioLayoutProps> = ({ children, ..._rest }): React.JSX.Element => {
  const { portfolioId } = useParams();
  const [thisPortfolio, setPortfolio] = useState({} as PortfolioModel);

  useEffect(() => {
    fetch(`/api/portfolio/${portfolioId}`)
      .then((response) => response.json())
      .then((data) => setPortfolio(data.portfolio as PortfolioModel))
      .catch((error) => console.error("error fetching portfolio:", error));
  }, []);

  return (
    <Flex wrap="wrap" mt="1" justify="center">
      <Box maxW="container.lg" flexBasis="100%" display="inline">
        <Text as="h1" textAlign="center">
          Portfolio {thisPortfolio.name} ({obfuscate(thisPortfolio.account)}-{thisPortfolio.baseCurrency})
        </Text>
        {children}
      </Box>
      <SideBar links={links(portfolioId)} />
    </Flex>
  );
};

export default PortfolioLayout;
