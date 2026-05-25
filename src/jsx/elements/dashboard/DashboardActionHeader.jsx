const DashboardActionHeader = ({
  userName,
  userEmail,
  userPhone,
  onClickDeposit,
  onOpenTransfer,
  onOpenWithdraw,
  disableFinancialActions = false,
  disabledActionReason = "",
}) => (
  <div className="d-flex justify-content-between flex-wrap">
    <div className="payment-content">
      <h1 className="font-w500 mb-2">Good morning, {userName}</h1>
      <p className="dz-para">
        {userEmail} | {userPhone}
      </p>
      {disableFinancialActions && disabledActionReason ? (
        <p className="text-muted small mb-0">{disabledActionReason}</p>
      ) : null}
    </div>
    <div className="mb-4 mb-xl-0">
      <button
        type="button"
        className="btn btn-primary me-3"
        onClick={onClickDeposit}
      >
        Deposit
      </button>
      <button
        type="button"
        className="btn btn-primary me-3"
        onClick={onOpenTransfer}
        disabled={disableFinancialActions}
        title={disableFinancialActions ? "Buy a card first to use Transfer" : ""}
      >
        Transfer
      </button>
      <button
        type="button"
        className="btn btn-primary"
        onClick={onOpenWithdraw}
        disabled={disableFinancialActions}
        title={disableFinancialActions ? "Buy a card first to use Withdraw" : ""}
      >
        Withdraw
      </button>
    </div>
  </div>
);

export default DashboardActionHeader;
