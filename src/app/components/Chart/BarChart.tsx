import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip } from "chart.js";
import React, { FunctionComponent } from "react";
import { Bar } from "react-chartjs-2";

export type DataSet = {
  label: string;
  data: number[];
};

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type BarChartProps = {
  title: string;
  labels: string[];
  datasets: DataSet[];
};

const SetParameters: {
  backgroundColor: string;
  borderColor: string;
}[] = [
  {
    backgroundColor: "rgba(54, 162, 235, 0.2)",
    borderColor: "rgb(54, 162, 235)",
  },
  {
    backgroundColor: "rgba(75, 192, 192, 0.2)",
    borderColor: "rgb(75, 192, 192)",
  },
  {
    backgroundColor: "rgba(252, 186, 3, 0.2)",
    borderColor: "rgb(252, 186, 3)",
  },
  {
    backgroundColor: "rgba(148, 3, 252, 0.2)",
    borderColor: "rgb(148, 3, 252)",
  },
  {
    backgroundColor: "rgba(255, 118, 64, 0.2)",
    borderColor: "rgb(255, 118, 64)",
  },
  {
    backgroundColor: "rgba(252, 3, 57, 0.2)",
    borderColor: "rgb(252, 3, 57)",
  },
];

const BarChart: FunctionComponent<BarChartProps> = ({ title, labels, datasets, ...rest }): React.ReactNode => {
  const chartData = {
    labels: labels,
    datasets: datasets.map((item, id) => ({
      id,
      borderWidth: 1,
      ...SetParameters[id],
      ...item,
    })),
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
