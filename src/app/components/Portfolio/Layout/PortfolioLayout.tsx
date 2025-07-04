import { Text, VStack } from "@chakra-ui/react";
import { FunctionComponent, default as React, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Portfolio as PortfolioModel } from "../../../../models/portfolio.model";
import { obfuscate } from "../../../utils";
import SideBar from "./SideBar";
import { links } from "./links";

interface PortfolioLayoutProps {
  children: React.ReactNode;
}

const PortfolioLayout: FunctionComponent<PortfolioLayoutProps> = ({ children, ..._rest }): React.ReactNode => {
  const { portfolioId } = useParams();
  const [thisPortfolio, setPortfolio] = useState({} as PortfolioModel);

  useEffect(() => {
    fetch(`/api/portfolio/${portfolioId}`)
      .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
      .then((data) => setPortfolio(data.portfolio as PortfolioModel))
      .catch((error) => console.error("error fetching portfolio:", error));
  }, []);

  return (
    <VStack>
      <Text as="h1" textAlign="center">
        Portfolio {thisPortfolio.name} ({obfuscate(thisPortfolio.account)}-{thisPortfolio.baseCurrency})
      </Text>
      <SideBar links={links(portfolioId)}>{children}</SideBar>
    </VStack>
  );
};

export default PortfolioLayout;
