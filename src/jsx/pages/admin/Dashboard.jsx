import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageTitle from "../../layouts/PageTitle";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { SelectPicker } from "rsuite";
import { Calendar } from "primereact/calendar";
import { SVGICON } from "../../constant/theme";
import ProjectAreaChart from "../../elements/dashboard/ProjectAreaChart";
import KycOverviewCard from "./components/KycOverviewCard";
import InviteFriendsStatsCard from "./components/InviteFriendsStatsCard";
import Clolesterol from "../widget/WidgetBasic/Clolesterol";
import GlucoseRate from "../widget/WidgetBasic/GlucoseRate";
import {
  adminMetrics,
  cardInventory,
  kycRecords,
  transactions,
} from "../../data/adminData";
import { getStatusSeverity } from "./components/statusUtils";
import StatCard from "./components/StatCard";
import { request } from "../../../utils/api";

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const resolveDashboardPayload = useCallback((payload) => {
    if (!payload || typeof payload !== "object") return null;
    if (
      payload.overview ||
      payload.status_breakdown ||
      payload.charts ||
      payload.recent_activity ||
      payload.top_countries
    ) {
      return payload;
    }
    if (payload.data) {
      return resolveDashboardPayload(payload.data);
    }
    return payload;
  }, []);

  // ✅ Presets (API uses date_range)
  const [datePreset, setDatePreset] = useState("30");

  // Custom range (only if backend supports start_date/end_date)
  const [dateRange, setDateRange] = useState(null);
  const [rangePanelOpen, setRangePanelOpen] = useState(false);
  const rangePanelRef = useRef(null);

  const formatDateParam = useCallback((value) => {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const formatRangeLabel = (range) => {
    if (!Array.isArray(range) || !range[0] || !range[1]) return "Custom Range";
    const format = (value) =>
      value.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    return `${format(range[0])} - ${format(range[1])}`;
  };

  const periodOptions = useMemo(
    () => [
      { label: "Today", value: "1" },
      { label: "This Week", value: "7" },
      { label: "Last 12 Days", value: "12" },
      { label: "This Month", value: "30" },
      { label: "Last 90 Days", value: "90" },
      {
        label:
          datePreset === "custom"
            ? formatRangeLabel(dateRange)
            : "Custom Range",
        value: "custom",
      },
    ],
    [datePreset, dateRange],
  );

  // ✅ FIX: null/clear handling + keep presets consistent
  const handlePresetChange = (value) => {
    if (!value) {
      setDatePreset("30");
      setDateRange(null);
      setRangePanelOpen(false);
      return;
    }
    setDatePreset(String(value));

    if (value === "custom") {
      setRangePanelOpen(true);
      return;
    }

    setDateRange(null);
    setRangePanelOpen(false);
  };

  const handleRangeChange = (value) => {
    setDateRange(value);
    if (Array.isArray(value) && value[0] && value[1]) {
      setRangePanelOpen(false);
    }
  };

  useEffect(() => {
    if (!rangePanelOpen) return;
    const handleClickOutside = (event) => {
      if (
        rangePanelRef.current &&
        !rangePanelRef.current.contains(event.target)
      ) {
        setRangePanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [rangePanelOpen]);

  // ✅ FIX: use date_range (not period_days)
  useEffect(() => {
    const shouldFetchCustom =
      datePreset === "custom" &&
      Array.isArray(dateRange) &&
      dateRange.length === 2 &&
      dateRange[0] &&
      dateRange[1];

    if (datePreset === "custom" && !shouldFetchCustom) return;

    const fetchDashboard = async () => {
      setDashboardLoading(true);
      try {
        const res = await request({
          url: "tevau/dashboard/statistics",
          method: "GET",
          data: {
            ...(datePreset && datePreset !== "custom"
              ? { date_range: datePreset }
              : {}),
            ...(shouldFetchCustom
              ? {
                  start_date: formatDateParam(dateRange[0]),
                  end_date: formatDateParam(dateRange[1]),
                }
              : {}),
          },
        });
        setDashboardData(resolveDashboardPayload(res));
      } catch (error) {
        console.error(error);
        setDashboardData(null);
      } finally {
        setDashboardLoading(false);
      }
    };

    fetchDashboard();
  }, [datePreset, dateRange, formatDateParam, resolveDashboardPayload]);

  const overview = dashboardData?.overview || {};
  const statusBreakdown = dashboardData?.status_breakdown || {};
  const charts = useMemo(() => dashboardData?.charts || {}, [
    dashboardData?.charts,
  ]);
  const recentActivity = dashboardData?.recent_activity || {};

  const statValue = useCallback(
    (value, suffix = "") =>
      dashboardLoading ? "..." : `${value ?? 0}${suffix}`,
    [dashboardLoading],
  );

  // ✅ CARDS ONLY from API response (no hard-coded counts)
  const statCards = useMemo(
    () => [
      {
        label: "Total Users",
        value: statValue(recentActivity.users ?? overview.total_users),
        icon: SVGICON.PatientUser,
        color: "primary",
      },
      {
        label: "Total KYC",
        value: statValue(recentActivity.kyc ?? overview.total_kyc),
        icon: SVGICON.FormIconSvg,
        color: "warning",
      },
      {
        label: "Total Cards",
        value: statValue(recentActivity.cards ?? overview.total_cards),
        icon: SVGICON.BillsSvg,
        color: "info",
      },
      {
        label: "Total Balance",
        value: statValue(overview.total_balance),
        icon: SVGICON.DollerSvg,
        color: "success",
      },

      {
        label: "Bound Cards",
        value: statValue(overview.bound_cards),
        icon: SVGICON.ArrowGreen,
        color: "primary",
      },
      {
        label: "Frozen Cards",
        value: statValue(overview.frozen_cards),
        icon: SVGICON.ArrowRed,
        color: "danger",
      },
      {
        label: "KYC Approval Rate",
        value: statValue(overview.kyc_approval_rate, "%"),
        icon: SVGICON.MessageIcon,
        color: "success",
      },

      {
        label: "Active Users",
        value: statValue(statusBreakdown.users?.active),
        icon: SVGICON.PatientUser,
        color: "secondary",
      },
      {
        label: "KYC Submitted",
        value: statValue(statusBreakdown.kyc?.submitted),
        icon: SVGICON.CallIcon,
        color: "warning",
      },
      {
        label: "KYC Approved",
        value: statValue(statusBreakdown.kyc?.approved),
        icon: SVGICON.SettingIcon,
        color: "success",
      },
      {
        label: "Cards Pending",
        value: statValue(statusBreakdown.cards?.pending),
        icon: SVGICON.GroupCoin,
        color: "secondary",
      },
    ],
    [dashboardLoading, overview, recentActivity, statValue, statusBreakdown],
  );

  // --- BELOW: keep your existing UI the same (no changes) ---
  const cardDetails = {
    Virtual: {
      tagline: "Instant digital card for secure online spending.",
      delivery: "Instant",
      features: ["Instant issue", "Spend controls"],
    },
    Physical: {
      tagline: "Premium physical card for daily spend and ATM access.",
      delivery: "3-5 business days",
      features: ["NFC tap-to-pay", "ATM access"],
    },
  };

  const cardPreview = cardInventory.filter((card) =>
    ["Virtual", "Physical"].includes(card.type),
  );
  const kycPreview = kycRecords.slice(0, 5);
  const txnPreview = transactions.slice(0, 5);

  const statusTemplate = (rowData) => (
    <Tag value={rowData.status} severity={getStatusSeverity(rowData.status)} />
  );

  const chartDates = useMemo(() => {
    const dates = new Set();
    (charts.daily_registrations || []).forEach((item) => dates.add(item.date));
    (charts.daily_kyc || []).forEach((item) => dates.add(item.date));
    (charts.daily_cards || []).forEach((item) => dates.add(item.date));
    return Array.from(dates).sort();
  }, [charts]);

  const formatChartLabel = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const mapChartData = (items) => {
    const map = new Map((items || []).map((item) => [item.date, item.count]));
    return chartDates.map((date) => map.get(date) ?? 0);
  };

  const projectSeries = chartDates.length
    ? [
        {
          name: "Registrations",
          data: mapChartData(charts.daily_registrations),
        },
        { name: "KYC", data: mapChartData(charts.daily_kyc) },
        { name: "Cards", data: mapChartData(charts.daily_cards) },
      ]
    : undefined;

  const projectCategories = chartDates.length
    ? chartDates.map(formatChartLabel)
    : undefined;

  const totalUsersLabel = dashboardLoading
    ? "..."
    : Number(overview.total_users || 0).toLocaleString();

  return (
    <>
      <PageTitle motherMenu="Dashboard" activeMenu="Overview" />

      <div className="row g-3 mb-3">
        <div className="col-12">
          <div className="d-flex align-items-center justify-content-end flex-wrap gap-2 nova-filter-bar">
            <div
              className="position-relative"
              ref={rangePanelRef}
              style={{ minWidth: 220 }}
            >
              <SelectPicker
                className="select-data"
                data={periodOptions}
                value={datePreset}
                onChange={handlePresetChange}
                onSelect={(value) => {
                  if (value === "custom") setRangePanelOpen(true);
                }}
                cleanable
                onClean={() => {
                  setDatePreset("30");
                  setDateRange(null);
                  setRangePanelOpen(false);
                }}
                searchable={false}
                placeholder="This Month"
              />

              {rangePanelOpen && datePreset === "custom" && (
                <div
                  className="card shadow-sm mt-2 nova-range-panel"
                  style={{ position: "absolute", right: 0, zIndex: 1050 }}
                >
                  <div className="card-body p-2">
                    <Calendar
                      inline
                      selectionMode="range"
                      value={dateRange}
                      onChange={(e) => handleRangeChange(e.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Cards now update with filter (API date_range) */}
      <div className="row g-3 mb-3">
        {statCards.map((stat) => (
          <div className="col-xl-3 col-lg-4 col-md-6" key={stat.label}>
            <StatCard
              title={stat.label}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
            />
          </div>
        ))}
      </div>

      {/* Everything below stays SAME */}
      <div className="row g-3 mb-3">
        <div className="col-12">
          <div className="card nova-panel">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                <div>
                  <h4 className="mb-1">Card Offerings</h4>
                  <p className="mb-0 text-muted">Virtual $10 | Physical $70</p>
                </div>
                <span className="badge bg-light text-dark">
                  {cardPreview.length} cards live
                </span>
              </div>

              <div className="nova-card-grid">
                {cardPreview.map((card) => {
                  const details = cardDetails[card.type] || {};
                  const features = details.features || [];
                  const statusClass =
                    card.status === "Available" ? "is-available" : "is-paused";

                  return (
                    <div
                      key={card.id}
                      className={`nova-card-tile is-${card.type.toLowerCase()}`}
                    >
                      <div className="nova-card-tile-content">
                        <div className="nova-card-badges">
                          <span className="nova-card-chip">
                            {card.type} Card
                          </span>
                          <span className={`nova-card-status ${statusClass}`}>
                            {card.status}
                          </span>
                        </div>

                        <h5 className="nova-card-name">{card.name}</h5>
                        <p className="nova-card-desc">{details.tagline}</p>

                        <div className="nova-card-meta">
                          <div>
                            <span className="nova-card-meta-label">Fee</span>
                            <span className="nova-card-meta-value">
                              ${card.fee.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="nova-card-meta-label">
                              Delivery
                            </span>
                            <span className="nova-card-meta-value">
                              {details.delivery}
                            </span>
                          </div>
                        </div>

                        {features.length > 0 && (
                          <div className="nova-card-features">
                            {features.map((feature) => (
                              <span
                                key={`${card.id}-${feature}`}
                                className="nova-card-feature"
                              >
                                <i className="pi pi-check-circle" />
                                {feature}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="nova-card-visual">
                        <img
                          src={card.image}
                          alt={`${card.name} preview`}
                          className="nova-card-hero"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-3 align-items-stretch">
        <div className="col-xl-6 d-flex">
          <div className="d-flex flex-column gap-3 flex-grow-1 w-100">
            <div className="flex-shrink-0">
              <KycOverviewCard
                className="h-100"
                showUpdatedAt={false}
                subtitle="Current distribution of KYC statuses."
              />
            </div>
            <div className="flex-grow-1 d-flex">
              <div className="card h-100 w-100">
                <div className="card-header border-0 pb-0">
                  <div className="clearfix">
                    <h3 className="card-title">Monthly Transactions</h3>
                    <span>In the normal</span>
                  </div>
                  <div className="clearfix text-center">
                    <h3 className="mb-0 text-info">
                      {adminMetrics.monthlyTransactions}
                    </h3>
                    <span>count</span>
                  </div>
                </div>
                <div className="card-body text-center">
                  <div className="ico-sparkline">
                    <GlucoseRate />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-6 d-flex">
          <InviteFriendsStatsCard className="h-100 w-100" />
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-xl-12">
          <div className="card crypto-chart h-auto">
            <div className="card-header pb-0 border-0 flex-wrap">
              <div>
                <div className="chart-title mb-3">
                  <h2 className="heading">Project Statistic</h2>
                </div>
              </div>

              <div className="p-static">
                <div className="progress-content">
                  <div className="d-flex justify-content-between">
                    <h6>Total</h6>
                    <span className="pull-end">{totalUsersLabel}</span>
                  </div>
                  <div className="progress mt-2">
                    <div
                      className="progress-bar bg-primary"
                      style={{ width: "60%", height: "100%" }}
                    >
                      <span className="sr-only">60% Complete</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-body pt-2 custome-tooltip pb-0">
              <ProjectAreaChart
                series={projectSeries}
                categories={projectCategories}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-xl-7">
          <div className="card nova-panel">
            <div className="card-body">
              <h4 className="mb-3">Latest KYC Submissions</h4>
              <DataTable
                value={kycPreview}
                className="p-datatable-sm nova-table"
              >
                <Column field="id" header="KYC ID" />
                <Column field="name" header="User" />
                <Column field="documentType" header="Document" />
                <Column field="submittedAt" header="Submitted" />
                <Column field="status" header="Status" body={statusTemplate} />
              </DataTable>
            </div>
          </div>
        </div>

        <div className="col-xl-5">
          <div className="card nova-panel">
            <div className="card-body">
              <h4 className="mb-3">Today Transactions</h4>
              <DataTable
                value={txnPreview}
                className="p-datatable-sm nova-table"
              >
                <Column field="id" header="Txn ID" />
                <Column field="user" header="User" />
                <Column field="amount" header="Amount" />
                <Column field="status" header="Status" body={statusTemplate} />
              </DataTable>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
