import { Text } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";
import { useLoaderData } from "react-router-dom";
import { TradeSynthesys } from "../../../../routers/trades.types";
import BarChart, { DataSet } from "../../Chart/BarChart";
import Nav from "./Nav";
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
      <Nav />
      <Text>Closed trades by month</Text>
      <BarChart title="Realized Performance" labels={labels} datasets={datasets} />
      <TradesMonthlyTable content={theSynthesys.byMonth} />
    </>
  );
};

export default TradeSummary;
