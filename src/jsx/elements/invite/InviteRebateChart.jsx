import ReactApexChart from "react-apexcharts";

const InviteRebateChart = ({ labels = [], inviteRebate = [], subAffiliateRebate = [] }) => {
  const chartOptions = {
    chart: {
      type: "line",
      height: 280,
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: "inherit",
    },
    stroke: {
      curve: "smooth",
      width: 3,
    },
    colors: ["#3b82f6", "#1f4f82"],
    dataLabels: { enabled: false },
    markers: {
      size: 5,
      strokeColors: "#ffffff",
      strokeWidth: 2,
      hover: { size: 7 },
    },
    grid: {
      borderColor: "#e8eef5",
      strokeDashArray: 4,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    xaxis: {
      categories: labels,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: "#8a97a8", fontSize: "12px" },
      },
    },
    yaxis: {
      min: 0,
      max: 1,
      tickAmount: 5,
      labels: {
        style: { colors: "#8a97a8", fontSize: "12px" },
      },
    },
    legend: {
      position: "bottom",
      horizontalAlign: "center",
      markers: { radius: 12 },
      fontSize: "13px",
      labels: { colors: "#4b5b6d" },
    },
    tooltip: {
      theme: "light",
      y: {
        formatter: (value) => Number(value || 0).toFixed(4),
      },
    },
  };

  const series = [
    { name: "Invite Rebate", data: inviteRebate },
    { name: "Sub-Affiliates Rebate", data: subAffiliateRebate },
  ];

  return (
    <div className="nova-invite-chart-wrap">
      <ReactApexChart
        options={chartOptions}
        series={series}
        type="line"
        height={280}
      />
    </div>
  );
};

export default InviteRebateChart;
