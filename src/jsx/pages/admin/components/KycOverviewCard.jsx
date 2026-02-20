import React, { useEffect, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { request } from "../../../../utils/api";

const KYC_STATUS_KEYS = ["approved", "pending", "rejected", "submitted"];

const getKycTotal = (response) => {
  const payload = response?.data ?? response;
  if (payload && typeof payload === "object" && "total" in payload) {
    const total = Number(payload.total);
    return Number.isFinite(total) ? total : 0;
  }
  if (
    payload?.data &&
    typeof payload.data === "object" &&
    "total" in payload.data
  ) {
    const total = Number(payload.data.total);
    return Number.isFinite(total) ? total : 0;
  }
  if (
    payload?.meta &&
    typeof payload.meta === "object" &&
    "total" in payload.meta
  ) {
    const total = Number(payload.meta.total);
    return Number.isFinite(total) ? total : 0;
  }
  if (Array.isArray(payload?.data)) return payload.data.length;
  if (Array.isArray(payload)) return payload.length;
  return 0;
};

const KycOverviewCard = ({
  title = "KYC Overview",
  subtitle = "Live distribution of approval states this month.",
  updatedAt = "",
  showUpdatedAt = true,
  className = "",
}) => {
  const [kycSummary, setKycSummary] = useState({
    approved: 0,
    pending: 0,
    rejected: 0,
    submitted: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchKycSummary = async () => {
    setLoading(true);
    try {
      const responses = await Promise.all(
        KYC_STATUS_KEYS.map((status) =>
          request({
            url: "/tevau/kyc",
            method: "GET",
            data: {
              status,
              per_page: 1,
              page: 1,
            },
          }),
        ),
      );

      const nextSummary = KYC_STATUS_KEYS.reduce((acc, status, index) => {
        acc[status] = getKycTotal(responses[index]);
        return acc;
      }, {});

      setKycSummary({
        approved: nextSummary.approved || 0,
        pending: nextSummary.pending || 0,
        rejected: nextSummary.rejected || 0,
        submitted: nextSummary.submitted || 0,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKycSummary();
  }, []);

  const kycSeries = [
    kycSummary.approved,
    kycSummary.pending,
    kycSummary.rejected,
    kycSummary.submitted,
  ];

  const kycOptions = {
    chart: {
      type: "donut",
      height: 220,
    },
    labels: ["Approved", "Pending", "Rejected", "Submitted"],
    colors: ["#2a6587", "#f59e0b", "#ef4444", "#94a3b8"],
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    legend: { show: false },
    plotOptions: {
      pie: {
        donut: {
          size: "72%",
        },
      },
    },
    tooltip: {
      y: {
        formatter: (value) => value.toLocaleString(),
      },
    },
  };

  const formatCount = (value) =>
    loading ? "..." : Number(value || 0).toLocaleString();

  const showUpdated = showUpdatedAt && updatedAt && updatedAt !== "N/A";

  return (
    <div className={`card nova-panel ${className}`.trim()}>
      <div className="card-body">
        <div className="nova-section-head">
          <div>
            <h4 className="mb-1">{title}</h4>
            <p className="text-muted mb-0">{subtitle}</p>
          </div>
          {showUpdated && (
            <span className="nova-profile-pill">Updated {updatedAt}</span>
          )}
        </div>
        <div className="nova-profile-chart-grid">
          <div className="nova-profile-chart">
            <ReactApexChart
              options={kycOptions}
              series={kycSeries}
              type="donut"
              height={220}
            />
          </div>
          <div className="nova-profile-chart-legend">
            <div className="nova-profile-legend-item">
              <span>
                <i className="nova-legend-dot success" /> Approved
              </span>
              <strong>{formatCount(kycSummary.approved)}</strong>
            </div>
            <div className="nova-profile-legend-item">
              <span>
                <i className="nova-legend-dot warning" /> Pending
              </span>
              <strong>{formatCount(kycSummary.pending)}</strong>
            </div>
            <div className="nova-profile-legend-item">
              <span>
                <i className="nova-legend-dot danger" /> Rejected
              </span>
              <strong>{formatCount(kycSummary.rejected)}</strong>
            </div>
            <div className="nova-profile-legend-item">
              <span>
                <i className="nova-legend-dot neutral" /> Submitted
              </span>
              <strong>{formatCount(kycSummary.submitted)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KycOverviewCard;
