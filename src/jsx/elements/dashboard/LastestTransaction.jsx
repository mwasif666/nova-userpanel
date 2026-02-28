import React from "react";

const LastestTransaction = ({
  rows = [],
  loading = false,
  error = "",
  title = "Latest Transactions",
}) => {
  return (
    <div className="card lastest_trans h-auto">
      <div className="card-header dz-border flex-wrap pb-3">
        <div>
          <h2 className="heading mb-0">{title}</h2>
        </div>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table shadow-hover trans-table border-no dz-border tbl-btn short-one mb-0">
            <thead>
              <tr>
                <th className="ps-3">Type</th>
                <th>Amount</th>
                <th>Date</th>
                <th className="pe-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="ps-3 py-4" colSpan={4}>
                    Loading transactions...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="ps-3 py-4 text-danger" colSpan={4}>
                    {error}
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((item) => (
                  <tr className="trans-td-list" key={item.id}>
                    <td className="ps-3">
                      <span className="font-w600">{item.title}</span>
                    </td>
                    <td>
                      <span className="fs-15 font-w500">{item.amountLabel}</span>
                    </td>
                    <td>
                      <span className="font-w400">{item.dateLabel}</span>
                    </td>
                    <td className="pe-3">
                      <span className="badge light badge-primary">
                        {item.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="ps-3 py-4 text-muted" colSpan={4}>
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="table-pagenation pt-3 mt-0">
        <p>
          {rows.length ? `Showing ${rows.length} recent records` : "No records"}
        </p>
      </div>
    </div>
  );
};

export default LastestTransaction;
