import { Box, Link, Spacer, Text } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";
import { Link as RouterLink, useLoaderData } from "react-router-dom";
import { TradeSynthesys } from "../../../../routers/trades.types";
import BarChart, { DataSet } from "../../Chart/BarChart";
import TradesMonthlyTable from "./TradesMonthlyTable";

type TradeSummaryProps = Record<string, never>;

const TradeSummary: FunctionComponent<TradeSummaryProps> = ({ ..._rest }): React.ReactNode => {
  const theSynthesys = useLoaderData() as TradeSynthesys;

  const labels = Object.keys(theSynthesys.byMonth).sort();
  const datasets: DataSet[] = [
    {
      label: "PnL",
      data: labels.reduce((p, v) => {
        p.push(theSynthesys.byMonth[v]["-"].total); // eslint-disable-line @typescript-eslint/no-unsafe-argument
        return p;
      }, [] as number[]),
    },
  ];

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
      <Text>Closed trades by month</Text>
      <BarChart title="Realized Performance" labels={labels} datasets={datasets} />
      <TradesMonthlyTable content={theSynthesys.byMonth} />
    </>
  );
};

export default TradeSummary;
