import { Box, Link, Spacer, Text } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";
import { Link as RouterLink, useLoaderData } from "react-router-dom";
import { TradeSynthesys } from "../../../../routers/trades.types";
import TradesTable from "./TradesTable";

type Props = Record<string, never>;

const TradesOpen: FunctionComponent<Props> = ({ ..._rest }): JSX.Element => {
  const theSynthesys = useLoaderData() as TradeSynthesys;

  return (
    <>
      <Box>
        <Spacer />
        <Link to={"../open"} as={RouterLink}>
          Open
        </Link>
        {" | "}
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
      <TradesTable content={theSynthesys.open} title="Open trades" />
    </>
  );
};

export default TradesOpen;
