import { Box, Link, Spacer } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { TradeLink } from "./links";

type NavProps = Record<string, never>;

const Nav: FunctionComponent<NavProps> = ({ ..._rest }): React.ReactNode => {
  const { portfolioId } = useParams();

  return (
    <Box>
      <Spacer />
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
      <Spacer />
    </Box>
  );
};

export default Nav;
