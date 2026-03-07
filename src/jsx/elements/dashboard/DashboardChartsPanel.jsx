import ProjectAreaChart from "./ProjectAreaChart";
import LastestTransaction from "./LastestTransaction";
import WeeklySummarChart from "./WeeklySummarChart";
import BarWeeklySummary from "./BarWeeklySummary";
import PieChartApex from "./PieChartApex";

const DashboardChartsPanel = ({
  walletDeposits,
  walletWithdrawals,
  walletCurrency,
  formatProtectedCurrency,
  projectChartSeries,
  latestTransactionRows,
  walletLoading,
  walletError,
  cardTypeChartItems,
  transactionBarSeries,
  weekdayLabels,
  cardStatusChartItems,
}) => (
  <div className="row g-3">
    <div className="col-xl-8">
      <div className="card crypto-chart h-auto">
        <div className="card-header pb-0 border-0 flex-wrap">
          <div>
            <div className="chart-title mb-2">
              <h2 className="heading">Transaction Trend (7 Days)</h2>
            </div>
            <p className="mb-0 text-muted">
              Wallet API transactions grouped by day (inflow vs outflow).
            </p>
          </div>
          <div className="p-static">
            <div className="progress-content">
              <div className="d-flex justify-content-between gap-4">
                <h6 className="mb-0">Deposits</h6>
                <span className="pull-end">
                  {formatProtectedCurrency(walletDeposits, walletCurrency)}
                </span>
              </div>
              <div className="d-flex justify-content-between gap-4 mt-1">
                <h6 className="mb-0">Withdrawals</h6>
                <span className="pull-end">
                  {formatProtectedCurrency(walletWithdrawals, walletCurrency)}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="card-body pt-2 custome-tooltip pb-0">
          <ProjectAreaChart series={projectChartSeries} categories={weekdayLabels} />
        </div>
      </div>
      <LastestTransaction rows={latestTransactionRows} loading={walletLoading} error={walletError} />
    </div>

    <div className="col-xl-4">
      <div className="card h-auto">
        <div className="card-header border-0 pb-1">
          <h4 className="mb-0 fs-20 font-w600">Cards Type Summary</h4>
        </div>
        <div className="card-body pb-0 pt-3 px-3 d-flex align-items-center flex-wrap">
          <div id="pieChart2">
            <WeeklySummarChart
              series={cardTypeChartItems.map((item) => item.value)}
              labels={cardTypeChartItems.map((item) => item.label)}
              colors={cardTypeChartItems.map((item) => item.color)}
            />
          </div>
          <div className="weeklydata">
            {cardTypeChartItems.map((item) => (
              <div className="d-flex align-items-center mb-2" key={item.label}>
                <svg
                  className="me-2"
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="14" height="14" rx="3" fill={item.color} />
                </svg>
                <h6 className="mb-0 fs-14 font-w400">{item.label}</h6>
                <span className="text-primary font-w700 ms-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card-body pt-0 pb-0 px-3">
          <h6 className="mb-2">Transactions by Weekday</h6>
          <div id="columnChart1" className="chartjs">
            <BarWeeklySummary series={transactionBarSeries} categories={weekdayLabels} />
          </div>
        </div>
      </div>

      <div className="card h-auto">
        <div className="card-body">
          <h4 className="fs-20 mb-1 mt-0">Card Status Breakdown</h4>
          <span className="text-muted">Distribution from cards status API data.</span>
          <div id="pieChart1" className="mt-2">
            <PieChartApex
              series={cardStatusChartItems.map((item) => item.value)}
              labels={cardStatusChartItems.map((item) => item.label)}
              colors={cardStatusChartItems.map((item) => item.color)}
            />
          </div>
          <div className="chart-labels">
            <ul className="mt-1 mb-0 list-unstyled">
              {cardStatusChartItems.map((item) => (
                <li className="d-flex align-items-center mb-2" key={item.label}>
                  <svg
                    className="me-2"
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect width="14" height="14" rx="7" fill={item.color} />
                  </svg>
                  <span>{item.label}</span>
                  <strong className="ms-auto">{item.value}</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default DashboardChartsPanel;
