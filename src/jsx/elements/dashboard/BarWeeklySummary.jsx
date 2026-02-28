import React, { useMemo } from "react";
import ReactApexChart from "react-apexcharts";

const DEFAULT_SERIES = [{ name: "Transactions", data: [0, 0, 0, 0, 0, 0, 0] }];
const DEFAULT_CATEGORIES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const BarWeeklySummary = ({ series, categories, height = 150 }) => {
  const chartSeries = Array.isArray(series) && series.length ? series : DEFAULT_SERIES;
  const chartCategories =
    Array.isArray(categories) && categories.length
      ? categories
      : DEFAULT_CATEGORIES;

  const backgroundBars = Array.from(
    { length: chartCategories.length },
    () => "#eef2f7",
  );

  const options = useMemo(
    () => ({
      chart: {
        id: "assetDistribution",
        type: "bar",
        height,
        toolbar: {
          show: false,
        },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "40%",
          borderRadius: 5,
          colors: {
            backgroundBarColors: backgroundBars,
            backgroundBarOpacity: 1,
            backgroundBarRadius: 5,
          },
        },
      },
      colors: ["var(--primary)"],
      xaxis: {
        show: false,
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        labels: {
          show: true,
          style: {
            colors: "#828282",
            fontSize: "14px",
            fontFamily: "Poppins",
            fontWeight: "light",
            cssClass: "apexcharts-xaxis-label",
          },
        },
        crosshairs: {
          show: false,
        },
        categories: chartCategories,
      },
      yaxis: {
        show: false,
      },
      grid: {
        show: false,
      },
      dataLabels: {
        enabled: false,
      },
      legend: {
        show: false,
      },
      fill: {
        opacity: 1,
      },
    }),
    [backgroundBars, chartCategories, height],
  );

  return (
    <ReactApexChart
      options={options}
      series={chartSeries}
      type="bar"
      height={height}
    />
  );
};

export default BarWeeklySummary;
