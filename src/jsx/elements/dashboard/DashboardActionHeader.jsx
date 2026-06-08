const DashboardActionHeader = ({
  userName,
  userEmail,
  userPhone,
  accountId,
  onClickDeposit,
  onOpenTransfer,
  onOpenWithdraw,
  disableFinancialActions = false,
}) => {
  const handleCopyAccountId = () => {
    if (
      !accountId ||
      typeof navigator === "undefined" ||
      !navigator.clipboard
    ) {
      return;
    }
    navigator.clipboard.writeText(accountId);
  };

  return (
    <div className="nova-dashboard-action-header">
      <div className="payment-content">
        <p className="nova-dashboard-greeting mb-1">Good morning,</p>
        <h1 className="font-w500 mb-3">{userName}</h1>
        <div className="nova-dashboard-identity-row">
          <span className="nova-dashboard-email-icon">
            <i className="pi pi-envelope" />
          </span>
          <span className="nova-dashboard-identity-text">{userEmail}</span>
          <span className="nova-dashboard-identity-divider" />
          <span className="nova-dashboard-identity-text">
            {accountId || userPhone || "N/A"}
          </span>
          {accountId ? (
            <button
              type="button"
              className="nova-dashboard-copy-btn"
              onClick={handleCopyAccountId}
              aria-label="Copy account ID"
              title="Copy account ID"
            >
              <i className="pi pi-copy" />
            </button>
          ) : null}
        </div>
      </div>
      <div className="nova-dashboard-actions">
        <button
          type="button"
          className="nova-dashboard-action-btn is-primary"
          onClick={onClickDeposit}
        >
          <i className="pi pi-download" />
          Deposit
        </button>
        <button
          type="button"
          className="nova-dashboard-action-btn"
          onClick={onOpenTransfer}
          disabled={disableFinancialActions}
          title={
            disableFinancialActions ? "Buy a card first to use Transfer" : ""
          }
        >
          <i className="pi pi-upload" />
          Transfer
        </button>
        <button
          type="button"
          className="nova-dashboard-action-btn"
          onClick={onOpenWithdraw}
          disabled={disableFinancialActions}
          title={
            disableFinancialActions ? "Buy a card first to use Withdraw" : ""
          }
        >
          <i className="pi pi-sign-out" />
          Withdraw
        </button>
      </div>
    </div>
  );
};

export default DashboardActionHeader;
