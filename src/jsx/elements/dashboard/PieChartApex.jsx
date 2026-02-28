import React, { useMemo } from "react";
import ReactApexChart from "react-apexcharts";

const DEFAULT_SERIES = [10, 20, 35, 20];
const DEFAULT_COLORS = ["#252289", "#D7D7D7", "#9568FF", "var(--primary)"];

const PieChartApex = ({ series, colors, labels, height = 250 }) => {
  const chartSeries = Array.isArray(series) && series.length ? series : DEFAULT_SERIES;
  const chartColors =
    Array.isArray(colors) && colors.length ? colors : DEFAULT_COLORS;

  const options = useMemo(
    () => ({
      chart: {
        type: "donut",
        height,
        innerRadius: 50,
      },
      labels,
      dataLabels: {
        enabled: false,
      },
      stroke: {
        width: 0,
      },
      plotOptions: {
        pie: {
          startAngle: 0,
          endAngle: 360,
          donut: {
            size: "80%",
            labels: {
              show: true,
              name: {},
            },
          },
        },
      },
      colors: chartColors,
      legend: {
        position: "bottom",
        show: false,
      },
      responsive: [
        {
          breakpoint: 768,
          options: {
            chart: {
              height: 200,
            },
          },
        },
      ],
    }),
    [chartColors, height, labels],
  );

  return (
    <ReactApexChart
      options={options}
      series={chartSeries}
      type="donut"
      height={height}
    />
  );
};

export default PieChartApex;
