import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip } from "chart.js";
import React, { FunctionComponent } from "react";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type BarChartProps = {
  title: string;
  labels: string[];
  pnl: number[];
  dividends: number[];
  fees: number[];
};

const BarChart: FunctionComponent<BarChartProps> = ({
  title,
  labels,
  pnl,
  dividends,
  fees,
  ...rest
}): React.ReactNode => {
  const chartData = {
    labels: labels,
    datasets: [
      {
        id: 1,
        label: "P/L",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        borderColor: "rgb(54, 162, 235)",
        borderWidth: 1,
        data: pnl,
      },
      {
        id: 2,
        label: "Div+Int",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        borderColor: "rgb(75, 192, 192)",
        borderWidth: 1,
        data: dividends,
      },
      {
        id: 3,
        label: "Fees",
        backgroundColor: "rgba(255, 159, 64, 0.2)",
        borderColor: "rgb(255, 159, 64)",
        borderWidth: 1,
        data: fees,
      },
    ],
  };
  const chartOptions = {
    title: {
      display: true,
      text: title,
    },
    tooltips: {
      mode: "index",
      intersect: false,
    },
    responsive: true,
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        grid: {
          color: "rgba(201, 203, 207, 0.2)",
          zeroLineColor: "rgba(201, 203, 207, 0.8)",
        },
      },
    },
  };

  return <Bar data={chartData} options={chartOptions} {...rest} />;
};

export default BarChart;
