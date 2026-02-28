import React, { useMemo } from "react";
import ReactApexChart from "react-apexcharts";

const DEFAULT_SERIES = [60, 115, 155];
const DEFAULT_COLORS = ["#d5dfe7", "#FF9F00", "#FD5353"];

const WeeklySummarChart = ({
  series,
  colors,
  labels,
  width = 130,
  height = 130,
}) => {
  const chartSeries = Array.isArray(series) && series.length ? series : DEFAULT_SERIES;
  const chartColors =
    Array.isArray(colors) && colors.length ? colors : DEFAULT_COLORS;

  const options = useMemo(
    () => ({
      chart: {
        type: "donut",
        width,
        height,
        innerRadius: 8,
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
          breakpoint: 1200,
          options: {
            chart: {
              width: 90,
              height: 90,
            },
            legend: {
              position: "bottom",
            },
          },
        },
      ],
    }),
    [chartColors, height, labels, width],
  );

  return (
    <ReactApexChart
      options={options}
      series={chartSeries}
      type="donut"
      height={height}
      width={width}
    />
  );
};

export default WeeklySummarChart;
