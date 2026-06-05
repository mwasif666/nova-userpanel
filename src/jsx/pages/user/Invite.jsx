import { useState } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import { toast } from "react-toastify";
import "swiper/css";
import "swiper/css/pagination";
import PageTitle from "../../layouts/PageTitle";
import InviteShareModal from "../../elements/invite/InviteShareModal";
import useReferralProgram from "../../hooks/useReferralProgram";
import { APP_ROUTES } from "../../router/routes";
import { formatUsdtAmount, RANK_SLIDE_CONFIG } from "../../../services/referral";
import { copyTextToClipboard } from "../../../utils/clipboard";

const truncateLink = (value, max = 28) => {
  const text = String(value || "");
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
};

const InviteRankCard = ({ slide, data }) => {
  const progressPercent = Math.min(
    100,
    Math.round((data.progressCurrent / data.progressTarget) * 100),
  );

  return (
    <div className="nova-invite-rank-card h-100">
      <div className="nova-invite-rank-head">
        <div className="nova-invite-rank-title">
          <i className={`pi ${slide.icon}`} />
          <span>{slide.title}</span>
        </div>
        <button type="button" className="nova-invite-rules-link btn btn-link p-0">
          Rules
        </button>
      </div>

      <div className="nova-invite-progress-meta">
        <span>
          Rank: <strong>{data.currentRank}</strong>
        </span>
        <span className="is-center">
          {data.progressCurrent}/{data.progressTarget}
        </span>
        <span className="is-right">
          Rank: <strong>{data.nextRank}</strong>
        </span>
      </div>

      <div className="nova-invite-progress-bar" aria-hidden="true">
        <span style={{ width: `${progressPercent}%` }} />
      </div>

      <p className="nova-invite-rank-note">
        * Rebate rates vary by project and are adjusted based on your rank.
      </p>

      <div className="nova-invite-subsection">
        <h6>Sub-Affiliates</h6>
        <p>Earn tiered commissions from all of your sub-affiliates members.</p>
      </div>

      {slide.showAffiliateCta && (
        <a
          href={data.affiliateProgramUrl || "#"}
          className="nova-invite-affiliate-cta"
          target={data.affiliateProgramUrl ? "_blank" : undefined}
          rel={data.affiliateProgramUrl ? "noopener noreferrer" : undefined}
          onClick={(event) => {
            if (!data.affiliateProgramUrl) {
              event.preventDefault();
              toast.info("Nova affiliate program link will be available soon.");
            }
          }}
        >
          <span>
            If you want more rebates, join the <strong>Nova affiliate program!</strong>
          </span>
          <i className="pi pi-angle-right" />
        </a>
      )}
    </div>
  );
};

const Invite = () => {
  const { loading, error, data } = useReferralProgram();
  const [shareOpen, setShareOpen] = useState(false);

  const handleCopy = async (value, label) => {
    try {
      await copyTextToClipboard(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error(`Unable to copy ${label.toLowerCase()}.`);
    }
  };

  return (
    <>
      <PageTitle motherMenu="Invite" activeMenu="Invitation" />

      <div className="nova-invite-page">
        <h2 className="nova-invite-hero-title">
          <span className="is-accent">Invite</span> Friend to Earn Rebates
        </h2>

        {error && (
          <div className="alert alert-warning" role="alert">
            {error}
          </div>
        )}

        <div className="nova-invite-layout">
          <div>
            <Swiper
              modules={[Pagination]}
              pagination={{ clickable: true }}
              spaceBetween={16}
              slidesPerView={1}
              className="nova-invite-swiper"
            >
              {RANK_SLIDE_CONFIG.map((slide) => (
                <SwiperSlide key={slide.key}>
                  <InviteRankCard slide={slide} data={data} />
                </SwiperSlide>
              ))}
            </Swiper>

            <div className="nova-invite-earned-bar">
              <span>Total Earned (USDT)</span>
              <span>{loading ? "Loading..." : formatUsdtAmount(data.totalEarned)}</span>
            </div>
          </div>

          <div className="nova-invite-panel mt-3 mt-lg-0">
            <div className="nova-invite-copy-row">
              <span>Invitation Code</span>
              <span className="nova-invite-copy-value">
                {data.invitationCode || "—"}
                <button
                  type="button"
                  className="nova-invite-copy-btn"
                  aria-label="Copy invitation code"
                  onClick={() => handleCopy(data.invitationCode, "Invitation code")}
                  disabled={!data.invitationCode}
                >
                  <i className="pi pi-copy" />
                </button>
              </span>
            </div>

            <div className="nova-invite-copy-row">
              <span>Invitation Link</span>
              <span className="nova-invite-copy-value">
                {truncateLink(data.invitationLink)}
                <button
                  type="button"
                  className="nova-invite-copy-btn"
                  aria-label="Copy invitation link"
                  onClick={() => handleCopy(data.invitationLink, "Invitation link")}
                  disabled={!data.invitationLink}
                >
                  <i className="pi pi-copy" />
                </button>
              </span>
            </div>
          </div>
        </div>

        <div className="nova-invite-actions">
          <Link to={APP_ROUTES.inviteStatistics} className="btn btn-outline-primary">
            Statistics
          </Link>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShareOpen(true)}
            disabled={!data.invitationLink}
          >
            Invite Friends
          </button>
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
