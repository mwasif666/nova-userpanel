import { Link } from "react-router-dom";
import PageTitle from "../../layouts/PageTitle";
import InviteRebateChart from "../../elements/invite/InviteRebateChart";
import ReferralRewardsTable from "../../elements/invite/ReferralRewardsTable";
import useReferralProgram from "../../hooks/useReferralProgram";
import { APP_ROUTES } from "../../router/routes";
import { formatUsdtAmount } from "../../../services/referral";

const toNum = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCompactUsdt = (value) => {
  const numeric = toNum(value);
  if (numeric === 0) return "0";
  return numeric.toLocaleString("en-US", { maximumFractionDigits: 8 });
};

const formatUsd = (value) =>
  `≈ $${toNum(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const CardWave = () => (
  <svg
    className="nova-stat-card-wave"
    viewBox="0 0 320 90"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <path
      d="M0,60 C50,40 90,78 150,55 C210,32 260,70 320,45 L320,90 L0,90 Z"
      fill="currentColor"
      opacity="0.55"
    />
    <path
      d="M0,72 C60,55 100,86 160,66 C220,46 270,78 320,58 L320,90 L0,90 Z"
      fill="currentColor"
      opacity="0.35"
    />
  </svg>
);

const InviteStatistics = () => {
  const { loading, error, data } = useReferralProgram();

  const labels = Array.isArray(data.chart?.labels) ? data.chart.labels : [];
  const inviteRebate = Array.isArray(data.chart?.inviteRebate)
    ? data.chart.inviteRebate
    : [];
  const subAffiliateRebate = Array.isArray(data.chart?.subAffiliateRebate)
    ? data.chart.subAffiliateRebate
    : [];

  // Derived display metrics (presentation only — no extra API calls).
  const combined = labels.map(
    (_, index) => toNum(inviteRebate[index]) + toNum(subAffiliateRebate[index]),
  );
  const totalRebate = combined.reduce((sum, value) => sum + value, 0);
  const highestDay = combined.length ? Math.max(...combined) : 0;
  const highestIndex = highestDay > 0 ? combined.indexOf(highestDay) : -1;
  const highestLabel = highestIndex >= 0 ? labels[highestIndex] : "--";
  const avgDaily = combined.length ? totalRebate / combined.length : 0;
  const totalDays = labels.length;

  const half = Math.floor(combined.length / 2);
  const prevSum = combined.slice(0, half).reduce((sum, value) => sum + value, 0);
  const currSum = combined.slice(half).reduce((sum, value) => sum + value, 0);
  const growth =
    prevSum > 0 ? ((currSum - prevSum) / prevSum) * 100 : currSum > 0 ? 100 : 0;
  const growthRounded = Math.round(growth * 10) / 10;
  const growthText = `${growthRounded > 0 ? "+" : ""}${growthRounded}%`;

  return (
    <>
      <PageTitle
        motherMenu="Invitation"
        motherMenuPath="/invite"
        activeMenu="Statistics"
      />

      <div className="nova-stat-page">
        {error && (
          <div className="alert alert-warning mb-0" role="alert">
            {error}
          </div>
        )}

        {/* Header */}
        <div className="nova-stat-header">
          <div className="nova-stat-header-main">
            <span className="nova-stat-header-icon" aria-hidden="true">
              <i className="pi pi-chart-bar" />
            </span>
            <div>
              <h4 className="nova-stat-header-title">Statistics</h4>
              <p className="nova-stat-header-sub">
                Track your rebates, invitations and rewards performance
              </p>
            </div>
          </div>

          <Link to={APP_ROUTES.invite} className="nova-stat-back-btn">
            <i className="pi pi-arrow-left" />
            Back to Invite
          </Link>
        </div>

        {/* Summary cards */}
        <div className="nova-stat-cards">
          <div className="nova-stat-card is-rebates">
            <span className="nova-stat-card-icon" aria-hidden="true">
              <i className="pi pi-gift" />
            </span>
            <div className="nova-stat-card-body">
              <div className="nova-stat-card-label">Total Rebates</div>
              <div className="nova-stat-card-value">
                {loading ? (
                  "—"
                ) : (
                  <>
                    {formatUsdtAmount(data.totalEarned)}
                    <span className="nova-stat-card-unit"> USDT</span>
                  </>
                )}
              </div>
              <div className="nova-stat-card-foot">
                {loading ? "" : formatUsd(data.totalEarned)}
              </div>
            </div>
            <CardWave />
          </div>

          <div className="nova-stat-card is-invites">
            <span className="nova-stat-card-icon" aria-hidden="true">
              <i className="pi pi-users" />
            </span>
            <div className="nova-stat-card-body">
              <div className="nova-stat-card-label">Total Invitations</div>
              <div className="nova-stat-card-value">
                {loading ? "—" : data.totalInvitations}
              </div>
              <div className="nova-stat-card-foot">People invited</div>
            </div>
            <CardWave />
          </div>
        </div>

        {/* Rebates Overview */}
        <div className="nova-stat-panel">
          <div className="nova-stat-panel-head">
            <div className="nova-stat-panel-titles">
              <h5 className="nova-stat-panel-title">
                Rebates Overview
                <i className="pi pi-info-circle" />
              </h5>
              <p className="nova-stat-panel-sub">
                Monitor your invite and sub-affiliate rebates over time
              </p>
            </div>
            <span className="nova-stat-range" aria-hidden="true">
              <i className="pi pi-calendar" />
              Last 7 Days
              <i className="pi pi-angle-down" />
            </span>
          </div>

          <InviteRebateChart
            labels={labels}
            inviteRebate={inviteRebate}
            subAffiliateRebate={subAffiliateRebate}
          />

          <div className="nova-stat-metrics">
            <div className="nova-stat-metric">
              <span className="nova-stat-metric-icon is-blue" aria-hidden="true">
                <i className="pi pi-chart-line" />
              </span>
              <div className="nova-stat-metric-body">
                <div className="nova-stat-metric-label">Highest Day</div>
                <div className="nova-stat-metric-value">
                  {formatCompactUsdt(highestDay)} USDT
                </div>
                <div className="nova-stat-metric-foot">{highestLabel}</div>
              </div>
            </div>

            <div className="nova-stat-metric">
              <span className="nova-stat-metric-icon is-purple" aria-hidden="true">
                <i className="pi pi-calendar" />
              </span>
              <div className="nova-stat-metric-body">
                <div className="nova-stat-metric-label">Average Daily Rebate</div>
                <div className="nova-stat-metric-value">
                  {formatCompactUsdt(avgDaily)} USDT
                </div>
                <div className="nova-stat-metric-foot">
                  {avgDaily > 0 ? "Per day" : "--"}
                </div>
              </div>
            </div>

            <div className="nova-stat-metric">
              <span className="nova-stat-metric-icon is-orange" aria-hidden="true">
                <i className="pi pi-chart-bar" />
              </span>
              <div className="nova-stat-metric-body">
                <div className="nova-stat-metric-label">Total Rebate Days</div>
                <div className="nova-stat-metric-value">{totalDays}</div>
                <div className="nova-stat-metric-foot">
                  Out of {totalDays} days
                </div>
              </div>
            </div>

            <div className="nova-stat-metric">
              <span className="nova-stat-metric-icon is-green" aria-hidden="true">
                <i className="pi pi-arrow-up-right" />
              </span>
              <div className="nova-stat-metric-body">
                <div className="nova-stat-metric-label">Growth</div>
                <div
                  className={`nova-stat-metric-value ${
                    growthRounded > 0
                      ? "is-up"
                      : growthRounded < 0
                        ? "is-down"
                        : ""
                  }`}
                >
                  {growthText}
                </div>
                <div className="nova-stat-metric-foot">vs previous 7 days</div>
              </div>
            </div>
          </div>
        </div>

        {/* Referral Rewards */}
        <div className="nova-stat-panel is-rewards">
          <ReferralRewardsTable rewards={data.rewards} />
        </div>
      </div>
    </>
  );
};

export default InviteStatistics;
