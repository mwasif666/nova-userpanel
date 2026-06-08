import { Link } from "react-router-dom";
import PageTitle from "../../layouts/PageTitle";
import InviteRebateChart from "../../elements/invite/InviteRebateChart";
import ReferralRewardsTable from "../../elements/invite/ReferralRewardsTable";
import useReferralProgram from "../../hooks/useReferralProgram";
import { APP_ROUTES } from "../../router/routes";
import { formatUsdtAmount } from "../../../services/referral";

const InviteStatistics = () => {
  const { loading, error, data } = useReferralProgram();

  return (
    <>
      <PageTitle motherMenu="Invitation" motherMenuPath="/invite" activeMenu="Statistics" />

      <div className="nova-invite-page">
        {error && (
          <div className="alert alert-warning mb-3" role="alert">
            {error}
          </div>
        )}

        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h4 className="mb-0">Statistics</h4>
          <Link to={APP_ROUTES.invite} className="btn btn-sm btn-outline-primary">
            <i className="pi pi-arrow-left me-1" />
            Back to Invite
          </Link>
        </div>

        <div className="nova-invite-stats-layout mb-3">
          <div className="nova-invite-stat-card">
            <div className="label">Total Rebates</div>
            <div className="value">
              {loading ? "—" : formatUsdtAmount(data.totalEarned)} USDT
            </div>
          </div>
          <div className="nova-invite-stat-card">
            <div className="label">Total invitations</div>
            <div className="value">
              {loading ? "—" : data.totalInvitations}
            </div>
          </div>
        </div>

        <div className="nova-invite-panel mb-3">
          <InviteRebateChart
            labels={data.chart.labels}
            inviteRebate={data.chart.inviteRebate}
            subAffiliateRebate={data.chart.subAffiliateRebate}
          />
        </div>

        <div className="nova-invite-panel">
          <ReferralRewardsTable rewards={data.rewards} />
        </div>
      </div>
    </>
  );
};

export default InviteStatistics;
