import { Box, Link, VStack } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { ReportLink } from "./links";

interface ReportLayoutProps {
  children: React.ReactNode;
}

const ReportLayout: FunctionComponent<ReportLayoutProps> = ({ children, ..._rest }): React.ReactNode => {
  const { portfolioId } = useParams();

  return (
    <VStack align="left">
      <Box>
        <Link asChild>
          <RouterLink to={ReportLink.toYtd(portfolioId)}>YTD</RouterLink>
        </Link>
        {" | "}
        <Link asChild>
          <RouterLink to={ReportLink.to12m(portfolioId)}>12M</RouterLink>
        </Link>
        {" | "}
        <Link asChild>
          <RouterLink to={ReportLink.toAll(portfolioId)}>All</RouterLink>
        </Link>
      </Box>
      {children}
    </VStack>
  );
};

export default ReportLayout;
