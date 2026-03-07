const OverviewMetricsBoard = ({
  showWalletBalanceLoading,
  walletBalanceToShow,
  walletCurrency,
  formatProtectedCurrency,
  walletBalanceUnlocked,
  toggleWalletBalanceVisibility,
  balanceToggleLabel,
  userCardsCount,
  overviewMetrics,
  onOpenMetric,
}) => (
  <div className="nova-cards-overview-board nova-dashboard-overview-board">
    <div className="nova-overview-stage-card nova-overview-stage-strip">
      <div className="nova-overview-stage-main">
        <div className="nova-overview-stage-head">
          <span className="nova-overview-stage-title">Payment Summary</span>
        </div>
        <div className="nova-overview-stage-stats">
          <strong>
            {showWalletBalanceLoading
              ? "Loading..."
              : formatProtectedCurrency(walletBalanceToShow, walletCurrency)}
          </strong>
          <button
            type="button"
            className={`nova-sec-visibility-toggle is-compact ${
              walletBalanceUnlocked ? "is-active" : ""
            }`}
            onClick={toggleWalletBalanceVisibility}
            aria-label={balanceToggleLabel}
            title={balanceToggleLabel}
          >
            <i className={`pi ${walletBalanceUnlocked ? "pi-eye-slash" : "pi-eye"}`} />
          </button>
          <span />
          <small>{userCardsCount} Cards</small>
        </div>
      </div>
      <div className="nova-overview-stage-cta">
        <i className="pi pi-chart-line" />
        Summary
      </div>
    </div>

    <div className="nova-overview-horizontal-scroll">
      <div className="nova-overview-metric-grid nova-overview-metric-grid-horizontal">
        {overviewMetrics.map((metric) => (
          <div className={`nova-overview-metric-card ${metric.tone}`} key={metric.title}>
            <div className="nova-overview-metric-icon">
              <span />
            </div>
            <div className="nova-overview-metric-content">
              <h6>{metric.title}</h6>
              <strong>{metric.value}</strong>
              <p>{metric.note}</p>
            </div>
            <button
              type="button"
              className="nova-overview-metric-arrow"
              onClick={() => onOpenMetric(metric)}
              aria-label={`Open ${metric.title} cards`}
            >
              <i className="pi pi-angle-right" />
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default OverviewMetricsBoard;
