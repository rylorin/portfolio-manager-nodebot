import { Box, Link, VStack } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { ReportLink } from "./links";

type ReportLayoutProps = {
  children: React.ReactNode;
};

const ReportLayout: FunctionComponent<ReportLayoutProps> = ({ children, ..._rest }): React.ReactNode => {
  const { portfolioId } = useParams();

  return (
    <VStack align="left">
      <Box>
        <Link to={ReportLink.toYtd(portfolioId)} as={RouterLink}>
          YTD
        </Link>
        {" | "}
        <Link to={ReportLink.to12m(portfolioId)} as={RouterLink}>
          12M
        </Link>
        {" | "}
        <Link to={ReportLink.toAll(portfolioId)} as={RouterLink}>
          All
        </Link>
      </Box>
      {children}
    </VStack>
  );
};

export default ReportLayout;
