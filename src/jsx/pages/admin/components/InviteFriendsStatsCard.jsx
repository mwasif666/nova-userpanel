import React, { useMemo } from "react";
import { adminMetrics } from "../../../data/adminData";

const DEFAULT_TIERS = [
  { amount: 10, label: "Starter Reward", weight: 0.45, bar: "primary" },
  { amount: 15, label: "Boost Reward", weight: 0.35, bar: "warning" },
  { amount: 20, label: "Premium Reward", weight: 0.2, bar: "success" },
];

const InviteFriendsStatsCard = ({
  totalInvites = adminMetrics.invitedFriends,
  tiers = DEFAULT_TIERS,
  className = "",
}) => {
  const total = Number(totalInvites || 0);

  const tierStats = useMemo(() => {
    const safeTiers = Array.isArray(tiers) && tiers.length ? tiers : [];
    let remaining = total;
    return safeTiers.map((tier, index) => {
      const isLast = index === safeTiers.length - 1;
      const count = isLast
        ? remaining
        : Math.max(0, Math.floor(total * (tier.weight || 0)));
      remaining -= count;
      const payout = count * Number(tier.amount || 0);
      const percent = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        ...tier,
        count,
        payout,
        percent,
      };
    });
  }, [tiers, total]);

  const totalPayout = tierStats.reduce((sum, tier) => sum + tier.payout, 0);

  return (
    <div className={`card nova-panel ${className}`.trim()}>
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
          <div>
            <h4 className="mb-1">Invite Friends</h4>
            <p className="text-muted mb-0">
              Referral rewards across payout tiers.
            </p>
          </div>
          <span className="badge bg-light text-dark">
            Total {total.toLocaleString()} invites
          </span>
        </div>

        <div className="row g-3 mb-3">
          <div className="col-6">
            <div className="border rounded p-3 h-100">
              <span className="text-muted small">Total Invites</span>
              <h4 className="mb-0">{total.toLocaleString()}</h4>
            </div>
          </div>
          <div className="col-6">
            <div className="border rounded p-3 h-100">
              <span className="text-muted small">Estimated Payout</span>
              <h4 className="mb-0">${totalPayout.toLocaleString()}</h4>
            </div>
          </div>
        </div>

        <div className="d-grid gap-3">
          {tierStats.map((tier) => (
            <div className="border rounded p-3" key={`tier-${tier.amount}`}>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="d-flex align-items-center gap-2">
                  <span className={`badge bg-${tier.bar}`}>${tier.amount}</span>
                  <span className="text-muted">{tier.label}</span>
                </div>
                <strong>{tier.count.toLocaleString()}</strong>
              </div>
              <div className="progress" style={{ height: 6 }}>
                <div
                  className={`progress-bar bg-${tier.bar}`}
                  style={{ width: `${tier.percent}%` }}
                />
              </div>
              <div className="d-flex justify-content-between mt-2 small text-muted">
                <span>{tier.count.toLocaleString()} rewards</span>
                <span>${tier.payout.toLocaleString()} paid</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InviteFriendsStatsCard;
