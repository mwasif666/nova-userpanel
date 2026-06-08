import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import PageTitle from "../../layouts/PageTitle";
import InviteShareModal from "../../elements/invite/InviteShareModal";
import useReferralProgram from "../../hooks/useReferralProgram";
import { APP_ROUTES } from "../../router/routes";
import { formatUsdtAmount } from "../../../services/referral";
import { copyTextToClipboard } from "../../../utils/clipboard";

const truncateLink = (value, max = 32) => {
  const text = String(value || "");
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
};

const Invite = () => {
  const { loading, error, data } = useReferralProgram();
  const [shareOpen, setShareOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState("");

  const handleCopy = async (value, label, key) => {
    try {
      await copyTextToClipboard(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(""), 2000);
    } catch {
      toast.error(`Unable to copy ${label.toLowerCase()}.`);
    }
  };

  const progressPercent = Math.min(
    100,
    data.progressTarget > 0
      ? Math.round((data.progressCurrent / data.progressTarget) * 100)
      : 0,
  );

  return (
    <>
      <PageTitle motherMenu="Home" activeMenu="Invitation" />
      <div className="nova-inv-page">

        {error && (
          <div className="alert alert-warning mb-3" role="alert">
            {error}
          </div>
        )}

        {/* Hero Banner */}
        <div className="nova-inv-hero">
          {/* Decorative circles */}
          <span className="nova-inv-deco-circle is-one" aria-hidden="true" />
          <span className="nova-inv-deco-circle is-two" aria-hidden="true" />

          <div className="nova-inv-hero-body">
            <div className="nova-inv-hero-left">
              {/* Paper airplane SVG */}
              <div className="nova-inv-plane-wrap" aria-hidden="true">
                <svg
                  className="nova-inv-plane-svg"
                  viewBox="0 0 110 90"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4 50 L106 8 L72 82 Z"
                    fill="rgba(255,255,255,0.60)"
                  />
                  <path
                    d="M4 50 L38 58 L72 82 Z"
                    fill="rgba(200,220,245,0.50)"
                  />
                  <path
                    d="M38 58 L72 82"
                    stroke="rgba(255,255,255,0.55)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M4 50 L38 58"
                    stroke="rgba(255,255,255,0.40)"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M38 58 L106 8"
                    stroke="rgba(255,255,255,0.25)"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  {/* trail dots */}
                  <circle
                    cx="18"
                    cy="44"
                    r="2.2"
                    fill="rgba(255,255,255,0.40)"
                  />
                  <circle
                    cx="9"
                    cy="38"
                    r="1.5"
                    fill="rgba(255,255,255,0.28)"
                  />
                </svg>
                {/* sparkles */}
                <span className="nova-inv-spark is-a" aria-hidden="true">
                  *
                </span>
                <span className="nova-inv-spark is-b" aria-hidden="true">
                  *
                </span>
                <span className="nova-inv-spark is-c" aria-hidden="true">
                  *
                </span>
              </div>

              <div className="nova-inv-hero-copy">
                <h2 className="nova-inv-hero-title">
                  Invite Friend to Earn Rebates
                </h2>
                <p className="nova-inv-hero-sub">
                  Share your link, invite friends, and earn amazing rebates
                  together.
                </p>
              </div>
            </div>

            <div className="nova-inv-hero-earned">
              <div className="nova-inv-hero-earned-label">
                Total Earned (USDT)
              </div>
              <div className="nova-inv-hero-earned-val">
                {loading ? "Loading..." : formatUsdtAmount(data.totalEarned)}
              </div>
              <span className="nova-inv-hero-earned-ico" aria-hidden="true">
                <i className="pi pi-dollar" />
              </span>
            </div>
          </div>

          {/* Stat pills */}
          <div className="nova-inv-hero-stats">
            <div className="nova-inv-hero-stat">
              <span className="nova-inv-hero-stat-ico">
                <i className="pi pi-users" />
              </span>
              <div>
                <div className="nova-inv-hero-stat-label">Your Rank</div>
                <div className="nova-inv-hero-stat-val">
                  {loading ? "—" : data.currentRank}
                </div>
              </div>
            </div>
            <div className="nova-inv-hero-stat">
              <span className="nova-inv-hero-stat-ico">
                <i className="pi pi-chart-line" />
              </span>
              <div>
                <div className="nova-inv-hero-stat-label">
                  Referrals to Next Rank
                </div>
                <div className="nova-inv-hero-stat-val">
                  {loading
                    ? "—"
                    : `${data.progressCurrent} / ${data.progressTarget}`}
                </div>
              </div>
            </div>
            <div className="nova-inv-hero-stat">
              <span className="nova-inv-hero-stat-ico">
                <i className="pi pi-star" />
              </span>
              <div>
                <div className="nova-inv-hero-stat-label">Next Rank</div>
                <div className="nova-inv-hero-stat-val">
                  {loading ? "—" : data.nextRank}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="nova-inv-grid">
          {/* Left: Share panel */}
          <div className="nova-inv-share-card">
            <div className="nova-inv-share-head">
              <span className="nova-inv-share-ico">
                <i className="pi pi-pencil" />
              </span>
              <div>
                <h5 className="nova-inv-share-title">Share Your Invite</h5>
                <p className="nova-inv-share-sub">
                  Invite your friends using your code or link below.
                </p>
              </div>
            </div>

            <div className="nova-inv-field">
              <label className="nova-inv-field-label">Invitation Code</label>
              <div className="nova-inv-field-row">
                <span className="nova-inv-field-val">
                  {data.invitationCode || "—"}
                </span>
                <div className="nova-inv-copy-wrap">
                  <button
                    type="button"
                    className={`nova-inv-copy-btn ${copiedKey === "code" ? "is-copied" : ""}`}
                    aria-label="Copy invitation code"
                    onClick={() => handleCopy(data.invitationCode, "Invitation code", "code")}
                    disabled={!data.invitationCode}
                  >
                    <i className={`pi ${copiedKey === "code" ? "pi-check" : "pi-copy"}`} />
                  </button>
                  {copiedKey === "code" && <span className="nova-inv-copy-tooltip">Copied!</span>}
                </div>
              </div>
            </div>

            <div className="nova-inv-field">
              <label className="nova-inv-field-label">Invitation Link</label>
              <div className="nova-inv-field-row">
                <span className="nova-inv-field-val is-link">
                  {truncateLink(data.invitationLink) || "—"}
                </span>
                <div className="nova-inv-copy-wrap">
                  <button
                    type="button"
                    className={`nova-inv-copy-btn ${copiedKey === "link" ? "is-copied" : ""}`}
                    aria-label="Copy invitation link"
                    onClick={() => handleCopy(data.invitationLink, "Invitation link", "link")}
                    disabled={!data.invitationLink}
                  >
                    <i className={`pi ${copiedKey === "link" ? "pi-check" : "pi-copy"}`} />
                  </button>
                  {copiedKey === "link" && <span className="nova-inv-copy-tooltip">Copied!</span>}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="nova-inv-btn is-primary"
              onClick={() => setShareOpen(true)}
              disabled={!data.invitationLink}
            >
              <i className="pi pi-user-plus me-2" />
              Invite Friends
            </button>

            <Link
              to={APP_ROUTES.inviteStatistics}
              className="nova-inv-btn is-outline"
            >
              <i className="pi pi-chart-bar me-2" />
              Statistics
            </Link>
          </div>

          {/* Right: Rank + Sub-affiliates + Earned */}
          <div className="nova-inv-right">
            {/* Rank card */}
            <div className="nova-inv-rank-card">
              <div className="nova-inv-rank-head">
                <span className="nova-inv-rank-ico">
                  <i className="pi pi-chart-bar" />
                </span>
                <h6 className="nova-inv-rank-title">Your Referral Rank</h6>
              </div>

              <div className="nova-inv-rank-meta">
                <span>
                  Rank <strong>{loading ? "—" : data.currentRank}</strong>
                </span>
                <span className="nova-inv-rank-meta-center">
                  {loading
                    ? "—"
                    : `${data.progressCurrent} / ${data.progressTarget}`}
                </span>
                <span className="nova-inv-rank-meta-right">
                  Rank <strong>{loading ? "—" : data.nextRank}</strong>
                </span>
              </div>

              <div className="nova-inv-rank-bar">
                <span style={{ width: `${progressPercent}%` }} />
              </div>

              <p className="nova-inv-rank-note">
                * Rebate rates vary by project and are adjusted based on your
                rank.
              </p>
            </div>

            {/* Sub-affiliates */}
            <div className="nova-inv-sub-card">
              <span className="nova-inv-sub-ico">
                <i className="pi pi-sitemap" />
              </span>
              <div className="nova-inv-sub-body">
                <h6>Sub-Affiliates</h6>
                <p>
                  Earn tiered commissions from all of your sub-affiliates
                  members.
                </p>
              </div>
              <i className="pi pi-angle-right nova-inv-sub-arrow" />
            </div>

            {/* Total Earned dark card */}
            <div className="nova-inv-earned-dark">
              <div className="nova-inv-earned-dark-ico">
                <i className="pi pi-wallet" />
              </div>
              <div className="nova-inv-earned-dark-body">
                <div className="nova-inv-earned-dark-label">
                  Total Earned (USDT)
                </div>
                <div className="nova-inv-earned-dark-val">
                  {loading ? "Loading..." : formatUsdtAmount(data.totalEarned)}
                </div>
              </div>
              <svg
                className="nova-inv-wave"
                viewBox="0 0 260 70"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M0,45 C40,25 70,58 110,40 C150,22 190,55 260,28"
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="2.5"
                  fill="none"
                />
                <circle
                  cx="110"
                  cy="40"
                  r="3.5"
                  fill="rgba(255,255,255,0.35)"
                />
                <circle
                  cx="190"
                  cy="34"
                  r="3.5"
                  fill="rgba(255,255,255,0.35)"
                />
                <circle
                  cx="260"
                  cy="28"
                  r="3.5"
                  fill="rgba(255,255,255,0.35)"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <InviteShareModal
        show={shareOpen}
        onHide={() => setShareOpen(false)}
        invitationLink={data.invitationLink}
      />
    </>
  );
};

export default Invite;
