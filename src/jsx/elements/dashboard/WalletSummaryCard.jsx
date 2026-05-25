import { useState } from "react";
import { Modal } from "react-bootstrap";

const formatTxType = (raw) => {
  if (!raw) return "Transaction";
  return String(raw)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatDateTime = (v) => {
  if (!v) return "N/A";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const getTxType = (txn) =>
  txn?.type || txn?.action || txn?.transaction_type || txn?.category || "";

const getTxAmount = (txn) =>
  txn?.amount ?? txn?.total_amount ?? txn?.value ?? 0;

const getTxDate = (txn) =>
  txn?.created_at || txn?.date || txn?.timestamp || txn?.updated_at || "";

const WalletSummaryCard = ({
  walletCurrency,
  showWalletBalanceLoading,
  walletBalanceToShow,
  formatProtectedCurrency,
  walletBalanceUnlocked,
  toggleWalletBalanceVisibility,
  balanceToggleLabel,
  userCardsLoading,
  activeCardCount,
  userCardsCount,
  walletAvailableBalance,
  walletLockedBalance,
  walletDeposits,
  walletWithdrawals,
  walletTotalTransactions,
  walletTxPreview,
  walletTransactions = [],
  userCardsError,
  walletError,
}) => {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <>
      <div className="card dz-wallet nova-home-wallet-glass overflow-hidden">
        <div className="boxs">
          <span className="box one"></span>
          <span className="box two"></span>
          <span className="box three"></span>
          <span className="box four"></span>
        </div>
        <div className="card-header border-0 pb-3 pb-sm-0 pe-4">
          <div className="wallet-icon">
            <svg width="62" height="39" viewBox="0 0 62 39" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="42.7722" cy="19.2278" r="19.2278" fill="white" fillOpacity="0.2" />
              <circle cx="19.2278" cy="19.2278" r="19.2278" fill="white" fillOpacity="0.2" />
            </svg>
          </div>
        </div>
        <div className="card-body py-3 pt-1 d-flex align-items-center justify-content-between flex-wrap pe-3">
          <div className="wallet-info">
            <div className="nova-wallet-balance-head">
              <span className="fs-14 font-w400 d-block mb-0">
                Available Balance ({walletCurrency})
              </span>
            </div>
            <div className="nova-wallet-balance-value">
              <h2 className="font-w600 mb-0">
                {showWalletBalanceLoading
                  ? "Loading..."
                  : formatProtectedCurrency(walletAvailableBalance, walletCurrency)}
              </h2>
              <button
                type="button"
                className="nova-sec-visibility-toggle nova-sec-visibility-inline"
                onClick={toggleWalletBalanceVisibility}
                aria-label={balanceToggleLabel}
                title={balanceToggleLabel}
              >
                <i className={`pi ${walletBalanceUnlocked ? "pi-eye-slash" : "pi-eye"}`} />
              </button>
            </div>
            <span>
              {userCardsLoading
                ? "Cards loading..."
                : `${activeCardCount} active of ${userCardsCount} cards`}
            </span>

            <div className="nova-wallet-overview">
              <span>Deposits: {formatProtectedCurrency(walletDeposits, walletCurrency)}</span>
              <span>Withdrawals: {formatProtectedCurrency(walletWithdrawals, walletCurrency)}</span>
              <span>Transactions: {walletTotalTransactions}</span>
            </div>

            {walletTxPreview.length > 0 && (
              <div className="nova-wallet-quick-tx">
                {walletTxPreview.map((txn) => (
                  <div className="nova-wallet-quick-tx-item" key={txn?.id || txn?.created_at}>
                    <span className="text-capitalize">{formatTxType(getTxType(txn))}</span>
                    <strong>{formatProtectedCurrency(getTxAmount(txn), walletCurrency)}</strong>
                  </div>
                ))}
                <button
                  type="button"
                  className="nova-wallet-see-all-btn"
                  onClick={() => setShowHistory(true)}
                >
                  <i className="pi pi-list me-1" />See All
                </button>
              </div>
            )}

            {userCardsError && <span className="text-danger d-block mt-1">{userCardsError}</span>}
            {walletError && <span className="text-warning d-block mt-1">{walletError}</span>}
          </div>
        </div>
      </div>

      {/* Full history modal */}
      <Modal centered size="lg" show={showHistory} onHide={() => setShowHistory(false)}>
        <div className="modal-header">
          <h5 className="modal-title">Transaction History</h5>
          <button type="button" className="btn-close" onClick={() => setShowHistory(false)} />
        </div>
        <div className="modal-body p-0">
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">#</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {walletTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">
                      <i className="pi pi-inbox me-2" />No transactions found.
                    </td>
                  </tr>
                ) : (
                  walletTransactions.map((txn, i) => {
                    const type = getTxType(txn);
                    const amount = getTxAmount(txn);
                    const date = getTxDate(txn);
                    const status = txn?.status || "";
                    const notes = txn?.description || txn?.notes || txn?.memo || "—";
                    const isCredit = String(type).toLowerCase().includes("deposit") || Number(amount) > 0;
                    return (
                      <tr key={txn?.id || i}>
                        <td className="ps-3 text-muted small">{i + 1}</td>
                        <td>
                          <span className="nova-tx-type-label">{formatTxType(type)}</span>
                        </td>
                        <td>
                          <strong className={isCredit ? "text-success" : "text-danger"}>
                            {formatProtectedCurrency(amount, walletCurrency)}
                          </strong>
                        </td>
                        <td className="text-muted small">{formatDateTime(date)}</td>
                        <td>
                          {status ? (
                            <span className={`nova-order-badge ${
                              String(status).toLowerCase() === "completed" || String(status).toLowerCase() === "success"
                                ? "nova-order-badge-success"
                                : String(status).toLowerCase() === "pending"
                                  ? "nova-order-badge-warning"
                                  : String(status).toLowerCase() === "failed"
                                    ? "nova-order-badge-danger"
                                    : "nova-order-badge-muted"
                            }`}>
                              {String(status).charAt(0).toUpperCase() + String(status).slice(1)}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="text-muted small">{notes}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={() => setShowHistory(false)}>Close</button>
        </div>
      </Modal>
    </>
  );
};

export default WalletSummaryCard;
