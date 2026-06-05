const ReferralRewardsTable = ({ rewards = [] }) => (
  <div className="nova-invite-rewards-table-wrap">
    <div className="nova-invite-rewards-head">
      <h5>Referral Rewards</h5>
      <p>Earn rewards by inviting friends to our platform</p>
    </div>

    <div className="nova-invite-rewards-table">
      <div className="nova-invite-rewards-row is-header">
        <span>Level</span>
        <span>Card Type</span>
        <span>Reward</span>
      </div>

      {rewards.map((row) => (
        <div className="nova-invite-rewards-row" key={`${row.level}-${row.cardType}`}>
          <span className="nova-invite-pill">{row.level}</span>
          <span className="nova-invite-card-type">
            <i
              className={`pi ${
                row.icon === "virtual" ? "pi-mobile" : "pi-credit-card"
              }`}
            />
            {row.cardType}
          </span>
          <span className="nova-invite-pill is-reward">{row.reward}</span>
        </div>
      ))}
    </div>
  </div>
);

export default ReferralRewardsTable;
