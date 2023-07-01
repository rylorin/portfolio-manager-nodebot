import { Box, Link, Spacer, Text } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";
import { Link as RouterLink, useLoaderData } from "react-router-dom";
import { TradeSynthesys } from "../../../../routers/types";
import TradeSynthesysTable from "./TradesIndex";
import TradesMonthlyTable from "./TradesMonthlyTable";

type TradeSummaryProps = Record<string, never>;

const TradeSummary: FunctionComponent<TradeSummaryProps> = ({ ..._rest }): JSX.Element => {
  const theSynthesys = useLoaderData() as TradeSynthesys;

  return (
    <>
      <Box>
        <Spacer />
        <Link to={"../ytd"} as={RouterLink}>
          YTD
        </Link>
        {" | "}
        <Link to={"../12m"} as={RouterLink}>
          12M
        </Link>
        {" | "}
        <Link to={"../all"} as={RouterLink}>
          All
        </Link>
        <Spacer />
      </Box>
      <Text>Open trades</Text>
      <TradeSynthesysTable content={theSynthesys.open} title="Open trades" />
      <Text>Closed trades by month</Text>
      <TradesMonthlyTable content={theSynthesys.byMonth} title="Closed trades" />
    </>
  );
};

export default TradeSummary;
