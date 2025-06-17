import { Box, Link, VStack } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { TradeLink } from "./links";

interface TradeLayoutProps {
  children: React.ReactNode;
}

const TradeLayout: FunctionComponent<TradeLayoutProps> = ({ children, ..._rest }): React.ReactNode => {
  const { portfolioId } = useParams();

  return (
    <VStack align="left">
      <Box>
        <Link asChild>
          <RouterLink to={TradeLink.toIndex(portfolioId)}>Open</RouterLink>
        </Link>
        {" | "}
        <Link asChild>
          <RouterLink to={TradeLink.toClosedYtd(portfolioId)}>YTD</RouterLink>
        </Link>
        {" | "}
        <Link asChild>
          <RouterLink to={TradeLink.toClosed12m(portfolioId)}>12M</RouterLink>
        </Link>
        {" | "}
        <Link asChild>
          <RouterLink to={TradeLink.toClosed(portfolioId)}>All</RouterLink>
        </Link>
      </Box>
      {children}
    </VStack>
  );
};

export default TradeLayout;
