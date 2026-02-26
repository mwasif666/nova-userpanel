import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
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
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  useEffect(() => {
    loadCards().catch(() => undefined);
  }, [loadCards]);

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

  return (
    <>
      <PageTitle motherMenu="Cards" activeMenu="Cards" />

      <div className="row g-3">
        <div className="col-12">
          <div className="card nova-panel">
            <div className="card-body">
              <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
                <div>
                  <div className="nova-flow-kicker mb-1">Cards Management</div>
                  <h4 className="mb-1">Order Physical / Virtual + Bind Card</h4>
                  <p className="mb-2 text-muted">
                    Tevau cards APIs are wired on this tab. Payment APIs can be added in the same flow once endpoints are shared.
                  </p>
                  <div className="nova-card-ops-launch-tags">
                    <span className="nova-wallet-stat-chip">
                      POST `/tevau/cards`
                    </span>
                    <span className="nova-wallet-stat-chip">
                      POST `/tevau/cards/bind`
                    </span>
                    <span className="nova-wallet-stat-chip">
                      User Code: {userCode || "N/A"}
                    </span>
                  </div>
                </div>
                <div className="d-flex flex-column flex-sm-row gap-2">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setCardModalOpen(true)}
                  >
                    Open Cards Flow
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => loadCards()}
                    disabled={loading}
                  >
                    {loading ? "Refreshing..." : "Refresh Cards"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4">
          <div className="card nova-panel h-100">
            <div className="card-body">
              <h5 className="mb-3">Cards Overview</h5>
              <div className="nova-card-live-grid">
                <div className="nova-card-live-item">
                  <span>Total Cards</span>
                  <strong>{stats.total}</strong>
                </div>
                <div className="nova-card-live-item">
                  <span>Active Cards</span>
                  <strong>{stats.active}</strong>
                </div>
                <div className="nova-card-live-item">
                  <span>Virtual</span>
                  <strong>{stats.virtual}</strong>
                </div>
                <div className="nova-card-live-item">
                  <span>Physical</span>
                  <strong>{stats.physical}</strong>
                </div>
                <div className="nova-card-live-item">
                  <span>Total Balance</span>
                  <strong>
                    {formatMoney(stats.totalBalance, stats.balanceCurrency)}
                  </strong>
                </div>
                <div className="nova-card-live-item">
                  <span>Payments</span>
                  <strong>Pending API</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-8">
          <div className="card nova-panel h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="mb-0">User Cards</h5>
                <span className="text-muted small">
                  {loading ? "Loading..." : `${cards.length} records`}
                </span>
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
                    {!loading && cards.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center text-muted py-4">
                          No cards found for this user.
                        </td>
                      </tr>
                    ) : (
                      cards.map((card) => (
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

      <CardOperationsModal
        show={cardModalOpen}
        onHide={() => setCardModalOpen(false)}
        user={user}
        userCards={cards}
        onCardsUpdated={() => loadCards({ silent: true })}
      />
    </>
  );
};

export default Cards;
