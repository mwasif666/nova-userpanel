import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Modal } from "react-bootstrap";
import PageTitle from "../../layouts/PageTitle";
import CardOperationsModal from "../../elements/dashboard/CardOperationsModal";
import { AuthContext } from "../../../context/authContext";
import { request } from "../../../utils/api";

const extractCardsRows = (response) => {
  const payload = response?.data?.data ?? response?.data ?? [];

  if (Array.isArray(payload)) {
    return { rows: payload, lastPage: 1 };
  }

  if (payload && typeof payload === "object" && Array.isArray(payload?.data)) {
    const parsedLastPage = Number(payload?.last_page || 1);
    return {
      rows: payload.data,
      lastPage:
        Number.isFinite(parsedLastPage) && parsedLastPage > 0
          ? parsedLastPage
          : 1,
    };
  }

  return { rows: [], lastPage: 1 };
};

const normalizeLabel = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "N/A";
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const normalizeCardType = (value) => {
  if (value === 1 || value === "1") return "Physical";
  if (value === 2 || value === "2") return "Virtual";
  const text = String(value || "").toLowerCase();
  if (text.includes("virtual")) return "Virtual";
  if (text.includes("physical")) return "Physical";
  return normalizeLabel(value);
};

const formatMoney = (value, currency = "USD") => {
  const numeric = Number(value ?? 0);
  const safe = Number.isFinite(numeric) ? numeric : 0;
  const code = String(currency || "USD").toUpperCase();

  try {
    return safe.toLocaleString("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch (error) {
    return `${code} ${safe.toLocaleString("en-US")}`;
  }
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const Cards = () => {
  const { user } = useContext(AuthContext);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [walletSummary, setWalletSummary] = useState({
    balance: null,
    availableBalance: null,
    currency: "USD",
    assetName: "",
    status: "",
  });
  const [walletLoading, setWalletLoading] = useState(false);
  const [tableFiltersOpen, setTableFiltersOpen] = useState(false);
  const [tableFilters, setTableFilters] = useState({
    type: "all",
    status: "all",
    bound: "all",
  });
  const [overviewModal, setOverviewModal] = useState({
    open: false,
    title: "",
    subtitle: "",
    rows: [],
  });

  const userId = user?.id;
  const userCode = user?.tevau_user?.user_code || null;
  const thirdId = user?.tevau_user?.third_id || null;

  const loadCards = useCallback(
    async ({ silent = false } = {}) => {
      if (!userId) {
        setCards([]);
        setError("");
        return [];
      }

      if (!silent) {
        setLoading(true);
      }
      setError("");

      try {
        const firstResponse = await request({
          url: "tevau/cards",
          method: "GET",
        });

        const firstPage = extractCardsRows(firstResponse);
        let rows = firstPage.rows;

        if (firstPage.lastPage > 1) {
          const pageRequests = Array.from(
            { length: firstPage.lastPage - 1 },
            (_, index) =>
              request({
                url: `tevau/cards?page=${index + 2}`,
                method: "GET",
              }),
          );
          const pageResponses = await Promise.all(pageRequests);
          const extraRows = pageResponses.flatMap(
            (pageRes) => extractCardsRows(pageRes).rows,
          );
          rows = [...rows, ...extraRows];
        }

        const deduped = Array.from(
          new Map(
            rows.map((row, index) => [
              String(row?.id ?? row?.card_id ?? `row-${index}`),
              row,
            ]),
          ).values(),
        );

        const filtered = deduped.filter((row) => {
          const rowUserCode = row?.user_code || row?.tevau_user?.user_code;
          const rowThirdId = row?.third_id || row?.tevau_user?.third_id;
          const rowUserId =
            row?.user_id ||
            row?.tevau_user?.user_id ||
            row?.tevau_user?.user?.id;

          return (
            (userCode && rowUserCode === userCode) ||
            (thirdId && rowThirdId === thirdId) ||
            (userId && Number(rowUserId) === Number(userId))
          );
        });

        setCards(filtered);
        return filtered;
      } catch (fetchError) {
        setCards([]);
        setError("Cards API se data load nahi ho saka.");
        return [];
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [thirdId, userCode, userId],
  );

  const loadWalletBalance = useCallback(async () => {
    if (!userId && !userCode && !thirdId) {
      setWalletSummary({
        balance: null,
        availableBalance: null,
        currency: "USD",
        assetName: "",
        status: "",
      });
      return null;
    }

    setWalletLoading(true);
    try {
      const res = await request({
        url: "wallet/balance",
        method: "GET",
        baseURL: "https://nova.innovationpixel.com/public/api/",
        data: {
          ...(userCode ? { user_code: userCode } : {}),
          ...(thirdId ? { third_id: thirdId } : {}),
          ...(userId ? { user_id: userId } : {}),
        },
      });

      const payload = res?.data ?? {};
      const assets = Array.isArray(payload?.assets) ? payload.assets : [];
      const bestAsset =
        [...assets].sort((a, b) => {
          const aValue = Number(a?.available_balance ?? a?.balance ?? 0) || 0;
          const bValue = Number(b?.available_balance ?? b?.balance ?? 0) || 0;
          return bValue - aValue;
        })[0] || null;

      setWalletSummary({
        balance: bestAsset?.balance ?? null,
        availableBalance: bestAsset?.available_balance ?? bestAsset?.balance ?? null,
        currency: bestAsset?.currency || "USD",
        assetName: bestAsset?.name || "",
        status: bestAsset?.status || "",
      });

      return bestAsset;
    } catch (walletError) {
      setWalletSummary((prev) => ({
        ...prev,
        balance: null,
        availableBalance: null,
      }));
      return null;
    } finally {
      setWalletLoading(false);
    }
  }, [thirdId, userCode, userId]);

  useEffect(() => {
    loadCards().catch(() => undefined);
    loadWalletBalance().catch(() => undefined);
  }, [loadCards, loadWalletBalance]);

  const stats = useMemo(() => {
    const activeCount = cards.filter((card) =>
      ["active", "normal"].includes(String(card?.status || "").toLowerCase()),
    ).length;
    const virtualCount = cards.filter(
      (card) => normalizeCardType(card?.card_type || card?.type) === "Virtual",
    ).length;
    const physicalCount = cards.filter(
      (card) => normalizeCardType(card?.card_type || card?.type) === "Physical",
    ).length;
    const totalBalance = cards.reduce((sum, card) => {
      const value = Number(card?.balance || 0);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
    const balanceCurrency = cards.find((card) => card?.currency)?.currency || "USD";

    return {
      total: cards.length,
      active: activeCount,
      virtual: virtualCount,
      physical: physicalCount,
      totalBalance,
      balanceCurrency,
    };
  }, [cards]);

  const overviewCards = useMemo(
    () => [
      {
        key: "total",
        title: "Total Cards",
        value: stats.total,
        sub: `${stats.active} active`,
        tone: "is-blue",
      },
      {
        key: "active",
        title: "Active Cards",
        value: stats.active,
        sub: "Active / Normal",
        tone: "is-slate",
      },
      {
        key: "virtual",
        title: "Virtual Cards",
        value: stats.virtual,
        sub: "Instant issue",
        tone: "is-purple",
      },
      {
        key: "physical",
        title: "Physical Cards",
        value: stats.physical,
        sub: "Courier flow",
        tone: "is-orange",
      },
      {
        key: "balance",
        title: "Total Balance",
        value: formatMoney(stats.totalBalance, stats.balanceCurrency),
        sub: `${String(stats.balanceCurrency || "USD").toUpperCase()} cards`,
        tone: "is-green",
      },
      {
        key: "wallet",
        title: "Wallet Available",
        value: walletLoading
          ? "Refreshing..."
          : formatMoney(
              walletSummary.availableBalance ?? walletSummary.balance ?? 0,
              walletSummary.currency || "USD",
            ),
        sub: walletSummary.assetName || "Wallet auto refresh",
        tone: "is-cyan",
      },
      {
        key: "payment",
        title: "Payment Mode",
        value: "Wallet Auto Debit",
        sub: "After order submit",
        tone: "is-rose",
      },
    ],
    [stats, walletLoading, walletSummary],
  );

  const getOverviewFilteredRows = useCallback(
    (key) => {
      if (!Array.isArray(cards)) return [];

      if (key === "virtual") {
        return cards.filter(
          (card) =>
            normalizeCardType(card?.card_type || card?.type).toLowerCase() === "virtual",
        );
      }

      if (key === "physical") {
        return cards.filter(
          (card) =>
            normalizeCardType(card?.card_type || card?.type).toLowerCase() === "physical",
        );
      }

      if (key === "active") {
        return cards.filter((card) =>
          ["active", "normal"].includes(String(card?.status || "").toLowerCase()),
        );
      }

      if (key === "balance") {
        return cards.filter((card) => Number(card?.balance || 0) > 0);
      }

      if (key === "wallet") {
        const walletCode = String(walletSummary.currency || "").toUpperCase();
        return cards.filter(
          (card) => String(card?.currency || "").toUpperCase() === walletCode,
        );
      }

      return cards;
    },
    [cards, walletSummary.currency],
  );

  const openOverviewFilteredModal = useCallback(
    (item) => {
      const rows = getOverviewFilteredRows(item.key);
      setOverviewModal({
        open: true,
        title: item.title,
        subtitle: `${rows.length} card(s) matched`,
        rows,
      });
    },
    [getOverviewFilteredRows],
  );

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const cardType = normalizeCardType(card?.card_type || card?.type).toLowerCase();
      const cardStatus = String(card?.status || "").trim().toLowerCase();
      const boundValue =
        typeof card?.is_bound === "boolean"
          ? card.is_bound
            ? "yes"
            : "no"
          : "na";

      const typePass =
        tableFilters.type === "all" || cardType === tableFilters.type;
      const statusPass =
        tableFilters.status === "all" || cardStatus === tableFilters.status;
      const boundPass =
        tableFilters.bound === "all" || boundValue === tableFilters.bound;

      return typePass && statusPass && boundPass;
    });
  }, [cards, tableFilters]);

  const tableFilterOptions = useMemo(() => {
    const statuses = Array.from(
      new Set(
        cards
          .map((card) => String(card?.status || "").trim().toLowerCase())
          .filter(Boolean),
      ),
    );
    return {
      statuses,
    };
  }, [cards]);

  return (
    <>
      <PageTitle motherMenu="Cards" activeMenu="Cards" />

      <div className="row g-3">
        <div className="col-12">
          <div className="card nova-panel h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="mb-0">Cards Overview</h5>
                <button type="button" className="btn btn-sm btn-light">
                  <i className="pi pi-sync me-1" />
                  Live
                </button>
              </div>

              <div className="nova-cards-overview-board nova-cards-overview-horizontal">
                <div className="nova-overview-stage-card nova-overview-stage-strip">
                  <div className="nova-overview-stage-main">
                    <div className="nova-overview-stage-head">
                      <span className="nova-overview-stage-title">Payment Summary</span>
                    </div>
                    <div className="nova-overview-stage-stats">
                      <strong>
                        {formatMoney(stats.totalBalance, stats.balanceCurrency)}
                      </strong>
                      <span />
                      <small>{stats.total} Cards</small>
                    </div>
                  </div>
                  <div className="nova-overview-stage-cta">
                    <i className="pi pi-wallet" />
                    Wallet linked purchase flow
                  </div>
                </div>

                <div className="nova-overview-horizontal-scroll">
                  <div className="nova-overview-metric-grid nova-overview-metric-grid-horizontal">
                  {overviewCards.map((item) => (
                    <div
                      key={item.key}
                      className={`nova-overview-metric-card ${item.tone}`}
                    >
                      <div className="nova-overview-metric-icon">
                        <span />
                      </div>
                      <div className="nova-overview-metric-content">
                        <h6>{item.title}</h6>
                        <strong>{item.value}</strong>
                        <p>{item.sub}</p>
                      </div>
                      <button
                        type="button"
                        className="nova-overview-metric-arrow"
                        aria-label={`${item.title} details`}
                        onClick={() => openOverviewFilteredModal(item)}
                      >
                        <i className="pi pi-angle-right" />
                      </button>
                    </div>
                  ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <CardOperationsModal
            inline
            user={user}
            userCards={cards}
            walletSummary={walletSummary}
            onCardsUpdated={() => loadCards({ silent: true })}
            onWalletUpdated={loadWalletBalance}
          />
        </div>

        <div className="col-12">
          <div className="card nova-panel h-100">
            <div className="card-body">
              <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 mb-3">
                <h5 className="mb-0">User Cards</h5>
                <div className="nova-table-tools">
                  <span className="text-muted small">
                    {loading ? "Loading..." : `${filteredCards.length} / ${cards.length} records`}
                  </span>
                  <div className="nova-table-filter-wrap">
                    <button
                      type="button"
                      className="nova-overview-metric-arrow"
                      aria-label="Open table filters"
                      onClick={() => setTableFiltersOpen((prev) => !prev)}
                    >
                      <i className="pi pi-filter" />
                    </button>
                    {tableFiltersOpen && (
                      <div className="nova-table-filter-popup">
                        <div className="nova-table-filter-title">Filter Cards</div>

                        <label className="nova-table-filter-field">
                          <span>Type</span>
                          <select
                            className="form-select form-select-sm"
                            value={tableFilters.type}
                            onChange={(event) =>
                              setTableFilters((prev) => ({
                                ...prev,
                                type: event.target.value,
                              }))
                            }
                          >
                            <option value="all">All</option>
                            <option value="physical">Physical</option>
                            <option value="virtual">Virtual</option>
                          </select>
                        </label>

                        <label className="nova-table-filter-field">
                          <span>Status</span>
                          <select
                            className="form-select form-select-sm"
                            value={tableFilters.status}
                            onChange={(event) =>
                              setTableFilters((prev) => ({
                                ...prev,
                                status: event.target.value,
                              }))
                            }
                          >
                            <option value="all">All</option>
                            {tableFilterOptions.statuses.map((status) => (
                              <option key={status} value={status}>
                                {normalizeLabel(status)}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="nova-table-filter-field">
                          <span>Bound</span>
                          <select
                            className="form-select form-select-sm"
                            value={tableFilters.bound}
                            onChange={(event) =>
                              setTableFilters((prev) => ({
                                ...prev,
                                bound: event.target.value,
                              }))
                            }
                          >
                            <option value="all">All</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                            <option value="na">N/A</option>
                          </select>
                        </label>

                        <div className="nova-table-filter-actions">
                          <button
                            type="button"
                            className="btn btn-sm btn-light"
                            onClick={() => {
                              setTableFilters({
                                type: "all",
                                status: "all",
                                bound: "all",
                              });
                            }}
                          >
                            Reset
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => setTableFiltersOpen(false)}
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {error ? <div className="alert alert-warning py-2">{error}</div> : null}

              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Card ID</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Balance</th>
                      <th>Bound</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!loading && filteredCards.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center text-muted py-4">
                          {cards.length
                            ? "No cards matched current filters."
                            : "No cards found for this user."}
                        </td>
                      </tr>
                    ) : (
                      filteredCards.map((card) => (
                        <tr key={String(card?.id ?? card?.card_id)}>
                          <td>{card?.card_id || card?.id || "N/A"}</td>
                          <td>{normalizeCardType(card?.card_type || card?.type)}</td>
                          <td>{normalizeLabel(card?.status)}</td>
                          <td>{formatMoney(card?.balance, card?.currency || "USD")}</td>
                          <td>
                            {typeof card?.is_bound === "boolean"
                              ? card.is_bound
                                ? "Yes"
                                : "No"
                              : "N/A"}
                          </td>
                          <td>{formatDateTime(card?.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        show={overviewModal.open}
        onHide={() =>
          setOverviewModal({ open: false, title: "", subtitle: "", rows: [] })
        }
        centered
        size="xl"
      >
        <div className="modal-header">
          <div>
            <h5 className="modal-title">{overviewModal.title || "Filtered Cards"}</h5>
            <div className="text-muted small">
              {overviewModal.subtitle || "Cards list"}
            </div>
          </div>
          <button
            type="button"
            className="btn-close"
            onClick={() =>
              setOverviewModal({ open: false, title: "", subtitle: "", rows: [] })
            }
            aria-label="Close"
          />
        </div>
        <div className="modal-body">
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Card ID</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Balance</th>
                  <th>Bound</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {overviewModal.rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">
                      No cards found for this filter.
                    </td>
                  </tr>
                ) : (
                  overviewModal.rows.map((card) => (
                    <tr key={`overview-${String(card?.id ?? card?.card_id)}`}>
                      <td>{card?.card_id || card?.id || "N/A"}</td>
                      <td>{normalizeCardType(card?.card_type || card?.type)}</td>
                      <td>{normalizeLabel(card?.status)}</td>
                      <td>{formatMoney(card?.balance, card?.currency || "USD")}</td>
                      <td>
                        {typeof card?.is_bound === "boolean"
                          ? card.is_bound
                            ? "Yes"
                            : "No"
                          : "N/A"}
                      </td>
                      <td>{formatDateTime(card?.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

    </>
  );
};

export default Cards;
