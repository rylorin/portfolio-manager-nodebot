import { Box, Link, VStack } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { TradeLink } from "./links";

type TradeLayoutProps = {
  children: React.ReactNode;
};

const TradeLayout: FunctionComponent<TradeLayoutProps> = ({ children, ..._rest }): React.ReactNode => {
  const { portfolioId } = useParams();

  return (
    <VStack align="left">
      <Box>
        <Link to={TradeLink.toIndex(portfolioId)} as={RouterLink}>
          Open
        </Link>
        {" | "}
        <Link to={TradeLink.toClosedYtd(portfolioId)} as={RouterLink}>
          YTD
        </Link>
        {" | "}
        <Link to={TradeLink.toClosed12m(portfolioId)} as={RouterLink}>
          12M
        </Link>
        {" | "}
        <Link to={TradeLink.toClosed(portfolioId)} as={RouterLink}>
          All
        </Link>
      </Box>
      {children}
    </VStack>
  );
};

export default TradeLayout;
