const ROW_TONES = ["is-blue", "is-green", "is-purple", "is-orange"];

const ReferralRewardsTable = ({ rewards = [] }) => (
  <div className="nova-stat-rewards">
    <div className="nova-stat-rewards-head">
      <span className="nova-stat-rewards-icon" aria-hidden="true">
        <i className="pi pi-gift" />
      </span>
      <div>
        <h5 className="nova-stat-rewards-title">Referral Rewards</h5>
        <p className="nova-stat-rewards-sub">
          Earn rewards by inviting friends to our platform
        </p>
      </div>
    </div>

    <div className="nova-stat-rewards-table">
      <div className="nova-stat-rewards-row is-header">
        <span>Level</span>
        <span>Card Type</span>
        <span>Reward</span>
      </div>

      {rewards.map((row, index) => {
        const tone = ROW_TONES[index % ROW_TONES.length];
        return (
          <div
            className={`nova-stat-rewards-row ${tone}`}
            key={row.id ?? `${row.level}-${row.cardType}-${index}`}
          >
            <span className="nova-stat-rewards-level">{row.level}</span>
            <span className="nova-stat-rewards-card">
              <span className="nova-stat-rewards-card-icon" aria-hidden="true">
                <i className="pi pi-credit-card" />
              </span>
              {row.cardType}
            </span>
            <span className="nova-stat-rewards-amount">{row.reward}</span>
          </div>
        );
      })}
    </div>
  </div>
);

export default ReferralRewardsTable;
