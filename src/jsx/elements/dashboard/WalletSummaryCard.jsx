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
  walletAssetName,
  walletStatus,
  walletAvailableBalance,
  walletLockedBalance,
  walletDeposits,
  walletWithdrawals,
  walletTotalTransactions,
  walletTxPreview,
  userCardsError,
  walletError,
}) => (
  <div className="card dz-wallet nova-home-wallet-glass overflow-hidden">
    <div className="boxs">
      <span className="box one"></span>
      <span className="box two"></span>
      <span className="box three"></span>
      <span className="box four"></span>
    </div>
    <div className="card-header border-0 pb-3 pb-sm-0 pe-4">
      <div className="wallet-icon">
        <svg
          width="62"
          height="39"
          viewBox="0 0 62 39"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="42.7722" cy="19.2278" r="19.2278" fill="white" fillOpacity="0.2" />
          <circle cx="19.2278" cy="19.2278" r="19.2278" fill="white" fillOpacity="0.2" />
        </svg>
      </div>
    </div>
    <div className="card-body py-3 pt-1 d-flex align-items-center justify-content-between flex-wrap pe-3">
      <div className="wallet-info">
        <div className="nova-wallet-balance-head">
          <span className="fs-14 font-w400 d-block mb-0">
            Wallet Balance ({walletCurrency})
          </span>
        </div>
        <div className="nova-wallet-balance-value">
          <h2 className="font-w600 mb-0">
            {showWalletBalanceLoading
              ? "Loading..."
              : formatProtectedCurrency(walletBalanceToShow, walletCurrency)}
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

        <div className="nova-wallet-stats">
          <span className="nova-wallet-stat-chip">Asset: {walletAssetName}</span>
          <span className="nova-wallet-stat-chip">
            Currency: {String(walletCurrency || "USD").toUpperCase()}
          </span>
          <span className="nova-wallet-stat-chip">Status: {walletStatus}</span>
          <span className="nova-wallet-stat-chip">
            Available: {formatProtectedCurrency(walletAvailableBalance, walletCurrency)}
          </span>
          {walletLockedBalance !== null && (
            <span className="nova-wallet-stat-chip">
              Locked: {formatProtectedCurrency(walletLockedBalance, walletCurrency)}
            </span>
          )}
        </div>

        <div className="nova-wallet-overview">
          <span>Deposits: {formatProtectedCurrency(walletDeposits, walletCurrency)}</span>
          <span>Withdrawals: {formatProtectedCurrency(walletWithdrawals, walletCurrency)}</span>
          <span>Transactions: {walletTotalTransactions}</span>
        </div>

        {walletTxPreview.length > 0 && (
          <div className="nova-wallet-quick-tx">
            {walletTxPreview.map((txn) => (
              <div className="nova-wallet-quick-tx-item" key={txn?.id || txn?.created_at}>
                <span className="text-capitalize">{txn?.type || "txn"} </span>
                <strong>{formatProtectedCurrency(txn?.amount || 0, walletCurrency)}</strong>
              </div>
            ))}
          </div>
        )}

        {userCardsError && <span className="text-danger d-block mt-1">{userCardsError}</span>}
        {walletError && <span className="text-warning d-block mt-1">{walletError}</span>}
      </div>
    </div>
  </div>
);

export default WalletSummaryCard;
