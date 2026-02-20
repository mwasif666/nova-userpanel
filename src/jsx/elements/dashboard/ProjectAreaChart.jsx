import React, { useMemo } from "react";
import ReactApexChart from "react-apexcharts";

const DEFAULT_SERIES = [
  {
    name: "Persent",
    data: [60, 70, 80, 50, 60, 50, 90],
  },
  {
    name: "Visitors",
    data: [40, 50, 40, 60, 90, 70, 90],
  },
];

const DEFAULT_CATEGORIES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const ProjectAreaChart = ({ series, categories }) => {
  const chartSeries = Array.isArray(series) && series.length ? series : DEFAULT_SERIES;
  const chartCategories =
    Array.isArray(categories) && categories.length
      ? categories
      : DEFAULT_CATEGORIES;
  const palette = ["#1EA7C5", "#FF9432", "#2A6587"];
  const seriesColors = chartSeries.map(
    (_, index) => palette[index % palette.length],
  );
  const markerSize = Array.from({ length: chartSeries.length }, () => 8);
  const markerStrokeWidth = Array.from({ length: chartSeries.length }, () => 4);
  const markerColors = Array.from({ length: chartSeries.length }, () => "#fff");

  const options = useMemo(
    () => ({
      chart: {
        id: "assetDistribution2",
        height: 300,
        type: "area",
        group: "social",
        toolbar: {
          show: false,
        },
        zoom: {
          enabled: false,
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        width: Array.from({ length: chartSeries.length }, () => 3),
        colors: seriesColors,
        curve: "straight",
      },
      legend: {
        show: false,
        tooltipHoverFormatter: function (val, opts) {
          return (
            val +
            " - " +
            opts.w.globals.series[opts.seriesIndex][opts.dataPointIndex] +
            ""
          );
        },
        markers: {
          fillColors: seriesColors,
          width: 16,
          height: 16,
          strokeWidth: 0,
          radius: 16,
        },
      },
      markers: {
        size: markerSize,
        strokeWidth: markerStrokeWidth,
        strokeColors: seriesColors,
        border: 2,
        radius: 2,
        colors: markerColors,
        hover: {
          size: 10,
        },
      },
      xaxis: {
        categories: chartCategories,
        labels: {
          style: {
            colors: "#3E4954",
            fontSize: "14px",
            fontFamily: "Poppins",
            fontWeight: 100,
          },
        },
        axisBorder: {
          show: false,
        },
      },
      yaxis: {
        labels: {
          minWidth: 20,
          offsetX: -16,
          style: {
            colors: "#3E4954",
            fontSize: "14px",
            fontFamily: "Poppins",
            fontWeight: 100,
          },
        },
      },
      fill: {
        type: "gradient",
        colors: seriesColors,
        opacity: 1,
        gradient: {
          shade: "light",
          shadeIntensity: 0.6,
          opacityFrom: 0.25,
          opacityTo: 0,
          stops: [0, 100],
        },
      },
      colors: seriesColors,
      grid: {
        borderColor: "#f1f1f1",
        xaxis: {
          lines: {
            show: true,
          },
        },
        yaxis: {
          lines: {
            show: false,
          },
        },
      },
      responsive: [
        {
          breakpoint: 1602,
          options: {
            markers: {
              size: Array.from({ length: chartSeries.length }, () => 6),
              hover: {
                size: 7,
              },
            },
            chart: {
              height: 230,
            },
          },
        },
      ],
    }),
    [chartCategories, chartSeries.length, markerSize, markerStrokeWidth, markerColors, seriesColors],
  );

  return (
    <div>
      <ReactApexChart
        options={options}
        series={chartSeries}
        type="area"
        height={300}
      />
    </div>
  );
};

export default ProjectAreaChart;
