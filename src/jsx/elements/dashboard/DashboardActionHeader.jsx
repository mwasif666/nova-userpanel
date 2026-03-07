const DashboardActionHeader = ({
  userName,
  userEmail,
  userPhone,
  onClickDeposit,
  onOpenTransfer,
  onOpenWithdraw,
}) => (
  <div className="d-flex justify-content-between flex-wrap">
    <div className="payment-content">
      <h1 className="font-w500 mb-2">Good morning, {userName}</h1>
      <p className="dz-para">
        {userEmail} | {userPhone}
      </p>
    </div>
    <div className="mb-4 mb-xl-0">
      <button type="button" className="btn btn-primary me-3" onClick={onClickDeposit}>
        Deposit
      </button>
      <button type="button" className="btn btn-primary me-3" onClick={onOpenTransfer}>
        Transfer
      </button>
      <button type="button" className="btn btn-primary" onClick={onOpenWithdraw}>
        Withdraw
      </button>
    </div>
  </div>
);

export default DashboardActionHeader;
