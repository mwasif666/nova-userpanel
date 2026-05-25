import React, { useCallback, useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { Spin } from "antd";
import PageTitle from "../../layouts/PageTitle";
import { request } from "../../../utils/api";

/* ── helpers ── */
const formatTxType = (raw) => {
  if (!raw) return "—";
  return String(raw).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatDateTime = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
};

const STATUS_BADGE = {
  completed:  { cls: "nova-order-badge-success", label: "Completed" },
  success:    { cls: "nova-order-badge-success", label: "Success" },
  pending:    { cls: "nova-order-badge-warning", label: "Pending" },
  processing: { cls: "nova-order-badge-info",    label: "Processing" },
  failed:     { cls: "nova-order-badge-danger",  label: "Failed" },
};

const getStatusBadge = (s) => STATUS_BADGE[String(s || "").toLowerCase()] || { cls: "nova-order-badge-muted", label: s || "—" };

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "deposit",       label: "Deposit" },
  { value: "withdraw",      label: "Withdraw" },
  { value: "card_purchase", label: "Card Purchase" },
  { value: "card_topup",    label: "Card Top Up" },
];

const STATUS_OPTIONS = [
  { value: "",           label: "All Status" },
  { value: "completed",  label: "Completed" },
  { value: "pending",    label: "Pending" },
  { value: "processing", label: "Processing" },
];

const NETWORK_OPTIONS = [
  { value: "",      label: "All Networks" },
  { value: "TRC20", label: "TRC20" },
  { value: "ERC20", label: "ERC20" },
  { value: "BEP20", label: "BEP20" },
];

const PER_PAGE = 20;

const truncate = (str, n = 16) =>
  str && str.length > n ? str.slice(0, n) + "..." : str || "—";

/* ── Page ── */
const WalletTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [totalCount, setTotalCount]     = useState(0);

  const [filterType,    setFilterType]    = useState("");
  const [filterStatus,  setFilterStatus]  = useState("");
  const [filterNetwork, setFilterNetwork] = useState("");

  const [detail, setDetail]       = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadTransactions = useCallback(async (pg, type, status, network) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: pg, per_page: PER_PAGE });
      if (type)    params.set("type",    type);
      if (status)  params.set("status",  status);
      if (network) params.set("network", network);

      const res = await request({ url: `wallet/transactions?${params.toString()}`, method: "GET" });
      const data = res?.data?.data || res?.data || {};
      const list = data?.transactions ?? data?.data ?? (Array.isArray(data) ? data : []);
      setTransactions(list);

      const meta = data?.meta || data?.pagination || {};
      const lastPage = meta?.last_page ?? meta?.total_pages ?? Math.ceil(((meta?.total) ?? list.length) / PER_PAGE) ?? 1;
      setTotalPages(lastPage || 1);
      setTotalCount((meta?.total) ?? list.length ?? 0);
    } catch {
      setError("Failed to load transactions. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions(page, filterType, filterStatus, filterNetwork);
  }, [loadTransactions, page, filterType, filterStatus, filterNetwork]);

  const applyFilters = () => {
    setPage(1);
    loadTransactions(1, filterType, filterStatus, filterNetwork);
  };

  const resetFilters = () => {
    setFilterType("");
    setFilterStatus("");
    setFilterNetwork("");
    setPage(1);
    loadTransactions(1, "", "", "");
  };

  const openDetail = async (txn) => {
    if (!txn?.id) return;
    setDetail(txn);
    setDetailLoading(true);
    try {
      const res = await request({ url: `wallet/transactions/${txn.id}`, method: "GET" });
      const d = res?.data?.data?.transaction ?? res?.data?.transaction ?? res?.data?.data ?? txn;
      setDetail(d);
    } catch {
      // keep the row data as fallback
    } finally {
      setDetailLoading(false);
    }
  };

  const isDeposit = (txn) => {
    const t = String(txn?.type || "").toLowerCase();
    return t === "deposit";
  };

  return (
    <>
      <PageTitle motherMenu="Wallet" activeMenu="Transaction History" />

      <div className="row g-3">
        {/* Filter card */}
        <div className="col-12">
          <div className="card nova-panel">
            <div className="card-body">
              <div className="nova-wtx-filter-bar">
                <div className="nova-wtx-filter-group">
                  <label>Type</label>
                  <select
                    className="nova-wtx-select"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                <div className="nova-wtx-filter-group">
                  <label>Status</label>
                  <select
                    className="nova-wtx-select"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                <div className="nova-wtx-filter-group">
                  <label>Network</label>
                  <select
                    className="nova-wtx-select"
                    value={filterNetwork}
                    onChange={(e) => setFilterNetwork(e.target.value)}
                  >
                    {NETWORK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                <div className="nova-wtx-filter-actions">
                  <button type="button" className="btn btn-primary btn-sm px-3" onClick={applyFilters} disabled={loading}>
                    <i className="pi pi-search me-1" />Apply
                  </button>
                  <button type="button" className="btn btn-outline-secondary btn-sm px-3" onClick={resetFilters} disabled={loading}>
                    <i className="pi pi-times me-1" />Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table card */}
        <div className="col-12">
          <div className="card nova-panel">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                <div>
                  <h5 className="mb-0">Transaction History</h5>
                  {!loading && totalCount > 0 && (
                    <p className="text-muted small mb-0 mt-1">{totalCount} total transactions</p>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => loadTransactions(page, filterType, filterStatus, filterNetwork)}
                  disabled={loading}
                >
                  {loading
                    ? <><Spin size="small" /><span className="ms-2">Loading...</span></>
                    : <><i className="pi pi-refresh me-1" />Refresh</>}
                </button>
              </div>

              {error && (
                <div className="nova-kyc-feedback is-error mb-3">
                  <i className="fa fa-exclamation-circle" /><span>{error}</span>
                </div>
              )}

              <div className="table-responsive">
                <table className="table table-hover table-sm align-middle mb-0 nova-wtx-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Reference</th>
                      <th>Type</th>
                      <th>Network</th>
                      <th>Amount</th>
                      <th>Fee</th>
                      <th>Net Amount</th>
                      <th>Status</th>
                      <th>Date & Time</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={10}>
                          <div className="nova-wtx-spin-overlay">
                            <Spin size="large" />
                            <span className="nova-wtx-spin-text">Loading transactions...</span>
                          </div>
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center text-muted py-5">
                          <i className="pi pi-inbox me-2" />No transactions found.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((txn, i) => {
                        const badge = getStatusBadge(txn?.status);
                        const credit = isDeposit(txn);
                        const rowNum = (page - 1) * PER_PAGE + i + 1;
                        return (
                          <tr key={txn?.id || i} className="nova-wtx-row">
                            <td className="text-muted small">{rowNum}</td>
                            <td>
                              <span className="nova-wtx-ref" title={txn?.reference_id}>
                                {truncate(txn?.reference_id, 20)}
                              </span>
                            </td>
                            <td>
                              <span className={`nova-wtx-type-pill ${String(txn?.type || "").toLowerCase().replace(/_/g, "-")}`}>
                                {formatTxType(txn?.type)}
                              </span>
                            </td>
                            <td>
                              <span className="nova-wtx-network-chip">
                                {txn?.network || txn?.method || "—"}
                              </span>
                            </td>
                            <td>
                              <strong className={credit ? "text-success" : "nova-wtx-debit"}>
                                {credit ? "+" : "-"}{txn?.amount ?? "—"} USDT
                              </strong>
                            </td>
                            <td className="text-muted small">{txn?.fee ?? "0"}</td>
                            <td className="text-muted small">{txn?.net_amount ?? "—"}</td>
                            <td>
                              <span className={`nova-order-badge ${badge.cls}`}>{badge.label}</span>
                            </td>
                            <td className="text-muted small">{formatDateTime(txn?.created_at)}</td>
                            <td>
                              <button
                                type="button"
                                className="nova-wtx-detail-btn"
                                onClick={() => openDetail(txn)}
                                title="View details"
                              >
                                <i className="pi pi-eye" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="nova-wtx-pagination">
                  <button
                    type="button"
                    className="nova-wtx-page-btn"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                  >
                    <i className="pi pi-angle-left" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, idx) => {
                    const pg = idx + 1;
                    return (
                      <button
                        key={pg}
                        type="button"
                        className={`nova-wtx-page-btn ${page === pg ? "is-active" : ""}`}
                        onClick={() => setPage(pg)}
                        disabled={loading}
                      >
                        {pg}
                      </button>
                    );
                  })}
                  {totalPages > 7 && page < totalPages && (
                    <>
                      <span className="nova-wtx-page-ellipsis">…</span>
                      <button
                        type="button"
                        className={`nova-wtx-page-btn ${page === totalPages ? "is-active" : ""}`}
                        onClick={() => setPage(totalPages)}
                        disabled={loading}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="nova-wtx-page-btn"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || loading}
                  >
                    <i className="pi pi-angle-right" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      <Modal centered size="md" show={!!detail} onHide={() => setDetail(null)}>
        <div className="modal-header">
          <h5 className="modal-title">Transaction Detail</h5>
          <button type="button" className="btn-close" onClick={() => setDetail(null)} />
        </div>
        <div className="modal-body">
          {detailLoading ? (
            <div className="nova-wtx-spin-overlay">
              <Spin size="large" />
              <span className="nova-wtx-spin-text">Loading...</span>
            </div>
          ) : detail ? (
            <div className="nova-wtx-detail-grid">
              {[
                { label: "ID",             value: detail?.id },
                { label: "Reference",      value: detail?.reference_id },
                { label: "Type",           value: formatTxType(detail?.type) },
                { label: "Method",         value: detail?.method },
                { label: "Network",        value: detail?.network },
                { label: "Amount",         value: `${detail?.amount ?? "—"} USDT` },
                { label: "Fee",            value: `${detail?.fee ?? "0"} USDT` },
                { label: "Net Amount",     value: `${detail?.net_amount ?? "—"} USDT` },
                { label: "Status",         value: detail?.status },
                { label: "Confirmations",  value: `${detail?.confirmations ?? 0} / ${detail?.required_confirmations ?? 0}` },
                { label: "Tx Hash",        value: detail?.transaction_hash },
                { label: "From Address",   value: detail?.from_address },
                { label: "To Address",     value: detail?.to_address },
                { label: "Date",           value: formatDateTime(detail?.created_at) },
              ].map(({ label, value }) =>
                value != null && value !== "" && value !== "— / —" ? (
                  <div className="nova-wtx-detail-row" key={label}>
                    <span className="nova-wtx-detail-label">{label}</span>
                    <span className="nova-wtx-detail-value" title={String(value)}>{String(value)}</span>
                  </div>
                ) : null
              )}
            </div>
          ) : null}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={() => setDetail(null)}>Close</button>
        </div>
      </Modal>
    </>
  );
};

export default WalletTransactions;
