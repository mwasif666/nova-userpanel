import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";
import { Modal } from "react-bootstrap";

import { SVGICON } from "../../constant/theme";
import ProjectAreaChart from "../../elements/dashboard/ProjectAreaChart";
import LastestTransaction from "../../elements/dashboard/LastestTransaction";
import PieChartApex from "../../elements/dashboard/PieChartApex";
import WeeklySummarChart from "../../elements/dashboard/WeeklySummarChart";
import BarWeeklySummary from "../../elements/dashboard/BarWeeklySummary";
import WalletDepositPanel from "../../elements/dashboard/WalletDepositPanel";
import { ThemeContext } from "../../../context/ThemeContext";
import { AuthContext } from "../../../context/authContext";
import { request } from "../../../utils/api";

const options = [
  { value: "1", label: "Select Menu" },
  { value: "2", label: "Bank Card" },
  { value: "3", label: "Online" },
  { value: "4", label: "Cash On Time" },
];

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const toSafeNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const formatCurrencyValue = (value, currency = "USD") => {
  const safeValue = toSafeNumber(value) ?? 0;
  const safeCurrency = String(currency || "USD").toUpperCase();

  try {
    return safeValue.toLocaleString("en-US", {
      style: "currency",
      currency: safeCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch (error) {
    return `${safeCurrency} ${safeValue.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
};

const normalizeStatus = (value) => {
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
  return normalizeStatus(value);
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

const isWalletAssetUsable = (asset) => {
  if (!asset || typeof asset !== "object") return false;
  const balance = toSafeNumber(asset?.balance) ?? 0;
  const available = toSafeNumber(asset?.available_balance) ?? 0;
  const status = String(asset?.status || "").toLowerCase();
  return (
    balance > 0 ||
    available > 0 ||
    (!asset?.coming_soon && status !== "coming_soon")
  );
};

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

const getWeekdayIndex = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const day = parsed.getDay(); // 0 Sun ... 6 Sat
  return day === 0 ? 6 : day - 1; // Mon first
};

const getTransactionRawAmount = (txn) => {
  const amountCandidates = [
    txn?.amount,
    txn?.transaction_amount,
    txn?.value,
    txn?.total,
    txn?.net_amount,
    txn?.debit,
    txn?.credit,
  ];
  for (const candidate of amountCandidates) {
    const parsed = toSafeNumber(candidate);
    if (parsed !== null) return parsed;
  }
  return 0;
};

const getTransactionTimestamp = (txn) =>
  txn?.created_at ||
  txn?.createdAt ||
  txn?.transaction_date ||
  txn?.date ||
  txn?.updated_at;

const formatDashboardDate = (value) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

export function CommandPage({ user }) {
  const [makePayment, setMakePayment] = useState(false);
  const [withdrowModal, setWithdrowModal] = useState(false);
  const [userCards, setUserCards] = useState([]);
  const [userCardsLoading, setUserCardsLoading] = useState(false);
  const [userCardsError, setUserCardsError] = useState("");
  const [walletAssets, setWalletAssets] = useState([]);
  const [walletStatistics, setWalletStatistics] = useState(null);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [walletBalanceUnlocked, setWalletBalanceUnlocked] = useState(true);
  const [overviewModal, setOverviewModal] = useState({
    open: false,
    title: "",
    subtitle: "",
    rows: [],
  });
  const [cardModal, setCardModal] = useState(false);
  const userName = user?.name || "User";
  const userEmail = user?.email || "N/A";
  const userPhone = user?.phone || "N/A";
  const userCode = user?.tevau_user?.user_code || null;
  const thirdId = user?.tevau_user?.third_id || null;
  const roleRaw =
    typeof user?.role === "string"
      ? user.role
      : user?.role?.name || user?.role_key || "member";
  const roleLabel = roleRaw
    ? roleRaw.toString().charAt(0).toUpperCase() + roleRaw.toString().slice(1)
    : "Member";

  useEffect(() => {
    if (!user?.id) {
      setUserCards([]);
      setWalletAssets([]);
      setWalletStatistics(null);
      setWalletTransactions([]);
      setWalletError("");
      return;
    }

    let mounted = true;

    const loadUserCards = async () => {
      setUserCardsLoading(true);
      setUserCardsError("");

      try {
        const res = await request({
          url: "tevau/cards",
          method: "GET",
        });
        const firstPageResult = extractCardsRows(res);
        let rows = firstPageResult.rows;

        if (firstPageResult.lastPage > 1) {
          const pageRequests = Array.from(
            { length: firstPageResult.lastPage - 1 },
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

        rows = Array.from(
          new Map(
            rows.map((row, index) => [
              String(row?.id ?? row?.card_id ?? `row-${index}`),
              row,
            ]),
          ).values(),
        );

        const filtered = rows.filter((row) => {
          const rowUserCode = row?.user_code || row?.tevau_user?.user_code;
          const rowThirdId = row?.third_id || row?.tevau_user?.third_id;
          const rowUserId =
            row?.user_id ||
            row?.tevau_user?.user_id ||
            row?.tevau_user?.user?.id;

          return (
            (userCode && rowUserCode === userCode) ||
            (thirdId && rowThirdId === thirdId) ||
            (user?.id && Number(rowUserId) === Number(user.id))
          );
        });

        if (mounted) {
          setUserCards(filtered);
        }
      } catch (error) {
        if (mounted) {
          setUserCards([]);
          setUserCardsError("Cards load nahi ho sake.");
        }
      } finally {
        if (mounted) {
          setUserCardsLoading(false);
        }
      }
    };

    const loadWalletBalance = async () => {
      setWalletLoading(true);
      setWalletError("");

      try {
        const res = await request({
          url: "wallet/balance",
          method: "GET",
          baseURL: "https://nova.innovationpixel.com/public/api/",
          data: {
            ...(userCode ? { user_code: userCode } : {}),
            ...(thirdId ? { third_id: thirdId } : {}),
            ...(user?.id ? { user_id: user.id } : {}),
          },
        });

        const payload = res?.data ?? {};
        const assets = Array.isArray(payload?.assets) ? payload.assets : [];
        const statistics =
          payload?.statistics && typeof payload.statistics === "object"
            ? payload.statistics
            : null;
        const recentTransactions = Array.isArray(payload?.recent_transactions)
          ? payload.recent_transactions
          : [];

        if (mounted) {
          setWalletAssets(assets);
          setWalletStatistics(statistics);
          setWalletTransactions(recentTransactions);

          if (!assets.length) {
            setWalletError("Wallet assets API se nahi mil sakin.");
          }
        }
      } catch (error) {
        if (mounted) {
          setWalletAssets([]);
          setWalletStatistics(null);
          setWalletTransactions([]);
          setWalletError("Wallet details load nahi ho sakin.");
        }
      } finally {
        if (mounted) {
          setWalletLoading(false);
        }
      }
    };

    loadUserCards();
    loadWalletBalance();

    return () => {
      mounted = false;
    };
  }, [user?.id, userCode, thirdId]);

  const totalCardBalance = userCards.reduce((sum, card) => {
    const value = Number(card?.balance || 0);
    return sum + (Number.isNaN(value) ? 0 : value);
  }, 0);

  const activeCardCount = userCards.filter((card) =>
    ["active", "normal"].includes(String(card?.status || "").toLowerCase()),
  ).length;

  const primaryWalletAsset = useMemo(() => {
    if (!walletAssets.length) return null;

    const priorityAssets = walletAssets.filter(isWalletAssetUsable);

    const source = priorityAssets.length ? priorityAssets : walletAssets;
    return [...source].sort((a, b) => {
      const scoreA =
        (toSafeNumber(a?.balance) ?? 0) +
        (toSafeNumber(a?.available_balance) ?? 0);
      const scoreB =
        (toSafeNumber(b?.balance) ?? 0) +
        (toSafeNumber(b?.available_balance) ?? 0);
      return scoreB - scoreA;
    })[0];
  }, [walletAssets]);

  const mappedWalletAsset = primaryWalletAsset;

  const walletCurrency = String(
    mappedWalletAsset?.currency ||
      primaryWalletAsset?.currency ||
      userCards.find((card) => card?.currency)?.currency ||
      "USD",
  ).toUpperCase();
  const walletBalanceToShow =
    toSafeNumber(mappedWalletAsset?.balance) ?? totalCardBalance;
  const walletAvailableBalance =
    toSafeNumber(mappedWalletAsset?.available_balance) ??
    toSafeNumber(walletStatistics?.available_balance) ??
    toSafeNumber(walletStatistics?.available) ??
    walletBalanceToShow;
  const walletLockedBalance = toSafeNumber(mappedWalletAsset?.locked_balance);
  const walletStatus = normalizeStatus(mappedWalletAsset?.status);
  const walletAssetName = mappedWalletAsset?.name || "N/A";
  const walletTotalTransactions = Math.max(
    0,
    Math.trunc(
      toSafeNumber(walletStatistics?.transaction_count) ??
        walletTransactions.length,
    ),
  );
  const walletDeposits = toSafeNumber(walletStatistics?.total_deposits) ?? 0;
  const walletWithdrawals =
    toSafeNumber(walletStatistics?.total_withdrawals) ?? 0;
  const walletTxPreview = walletTransactions.slice(0, 3);
  const showWalletBalanceLoading =
    userCardsLoading && walletLoading && !mappedWalletAsset;
  const balanceToggleLabel = walletBalanceUnlocked
    ? "Hide balance details"
    : "Show balance details";

  const formatProtectedCurrency = (value, currency = "USD") =>
    walletBalanceUnlocked ? formatCurrencyValue(value, currency) : "****";

  const virtualCardCount = useMemo(
    () =>
      userCards.filter((card) =>
        String(card?.type || card?.card_type || "")
          .toLowerCase()
          .includes("virtual"),
      ).length,
    [userCards],
  );
  const physicalCardCount = useMemo(
    () =>
      userCards.filter((card) =>
        String(card?.type || card?.card_type || "")
          .toLowerCase()
          .includes("physical"),
      ).length,
    [userCards],
  );

  const overviewMetrics = [
    {
      tone: "is-blue",
      title: "Total Cards",
      value: String(userCards.length),
      note: `${activeCardCount} active`,
      filterKey: "all",
      subtitle: "All cards list",
    },
    {
      tone: "is-slate",
      title: "Active Cards",
      value: String(activeCardCount),
      note: "Cards in active/normal state",
      filterKey: "active",
      subtitle: "Only active/normal cards",
    },
    {
      tone: "is-purple",
      title: "Virtual Cards",
      value: String(virtualCardCount),
      note: "Instant issue cards",
      filterKey: "virtual",
      subtitle: "Only virtual cards",
    },
    {
      tone: "is-orange",
      title: "Physical Cards",
      value: String(physicalCardCount),
      note: "Courier flow cards",
      filterKey: "physical",
      subtitle: "Only physical cards",
    },
    {
      tone: "is-green",
      title: "Total Balance",
      value: formatProtectedCurrency(walletBalanceToShow, walletCurrency),
      note: "Wallet + card balance",
      filterKey: "all",
      subtitle: "All cards with balances",
    },
    {
      tone: "is-cyan",
      title: "Available Balance",
      value: formatProtectedCurrency(walletAvailableBalance, walletCurrency),
      note: walletAssetName,
      filterKey: "all",
      subtitle: "All cards with balances",
    },
    {
      tone: "is-cyan",
      title: "Deposits",
      value: formatProtectedCurrency(walletDeposits, walletCurrency),
      note: "All-time deposits",
      filterKey: "all",
      subtitle: "All cards list",
    },
    {
      tone: "is-rose",
      title: "Withdrawals",
      value: formatProtectedCurrency(walletWithdrawals, walletCurrency),
      note: "All-time withdrawals",
      filterKey: "all",
      subtitle: "All cards list",
    },
  ];

  const transactionTrend = useMemo(() => {
    const inflow = Array.from({ length: WEEKDAY_LABELS.length }, () => 0);
    const outflow = Array.from({ length: WEEKDAY_LABELS.length }, () => 0);
    const counts = Array.from({ length: WEEKDAY_LABELS.length }, () => 0);

    walletTransactions.forEach((txn) => {
      const dayIndex = getWeekdayIndex(getTransactionTimestamp(txn));
      if (dayIndex === null) return;

      const rawAmount = getTransactionRawAmount(txn);
      const amount = Math.abs(rawAmount);
      const type = String(
        txn?.type || txn?.action || txn?.transaction_type || txn?.category || "",
      ).toLowerCase();
      const isOutflowByType = /(withdraw|purchase|debit|charge|fee|payment|transfer_out|out)/.test(
        type,
      );
      const isOutflow = rawAmount < 0 || isOutflowByType;

      if (isOutflow) {
        outflow[dayIndex] += amount;
      } else {
        inflow[dayIndex] += amount;
      }
      counts[dayIndex] += 1;
    });

    return {
      inflow: inflow.map((value) => Number(value.toFixed(2))),
      outflow: outflow.map((value) => Number(value.toFixed(2))),
      counts,
    };
  }, [walletTransactions]);

  const projectChartSeries = useMemo(
    () => [
      { name: "Inflow", data: transactionTrend.inflow },
      { name: "Outflow", data: transactionTrend.outflow },
    ],
    [transactionTrend.inflow, transactionTrend.outflow],
  );

  const transactionBarSeries = useMemo(
    () => [{ name: "Transactions", data: transactionTrend.counts }],
    [transactionTrend.counts],
  );

  const cardTypeChartItems = useMemo(() => {
    const otherCards = Math.max(
      userCards.length - virtualCardCount - physicalCardCount,
      0,
    );
    const entries = [
      { label: "Virtual", value: virtualCardCount, color: "#9568FF" },
      { label: "Physical", value: physicalCardCount, color: "#2696FD" },
      { label: "Other", value: otherCards, color: "#d5dfe7" },
    ].filter((entry) => entry.value > 0);

    return entries.length
      ? entries
      : [{ label: "No Cards", value: 1, color: "#d5dfe7" }];
  }, [physicalCardCount, userCards.length, virtualCardCount]);

  const cardStatusChartItems = useMemo(() => {
    const buckets = { active: 0, frozen: 0, closed: 0, other: 0 };
    userCards.forEach((card) => {
      const status = String(card?.status || "").toLowerCase();
      if (status.includes("active") || status.includes("normal")) {
        buckets.active += 1;
      } else if (status.includes("frozen") || status.includes("lock")) {
        buckets.frozen += 1;
      } else if (status.includes("closed")) {
        buckets.closed += 1;
      } else {
        buckets.other += 1;
      }
    });

    const entries = [
      { label: "Active", value: buckets.active, color: "#19a565" },
      { label: "Frozen", value: buckets.frozen, color: "#f39a1f" },
      { label: "Closed", value: buckets.closed, color: "#e1546f" },
      { label: "Other", value: buckets.other, color: "#d5dfe7" },
    ].filter((entry) => entry.value > 0);

    return entries.length
      ? entries
      : [{ label: "No Data", value: 1, color: "#d5dfe7" }];
  }, [userCards]);

  const latestTransactionRows = useMemo(
    () =>
      walletTransactions.slice(0, 8).map((txn, index) => {
        const rawAmount = getTransactionRawAmount(txn);
        const type = normalizeStatus(
          txn?.type || txn?.action || txn?.transaction_type || "Transaction",
        );
        const status = normalizeStatus(txn?.status || txn?.state || "Processed");

        return {
          id:
            txn?.id ||
            txn?.uuid ||
            `${type}-${index}-${getTransactionTimestamp(txn) || "na"}`,
          title: txn?.network ? `${type} (${txn.network})` : type,
          amountLabel: formatCurrencyValue(Math.abs(rawAmount), walletCurrency),
          dateLabel: formatDashboardDate(getTransactionTimestamp(txn)),
          statusLabel: status,
        };
      }),
    [walletCurrency, walletTransactions],
  );

  const getMetricCardsRows = (filterKey) => {
    if (!Array.isArray(userCards) || !userCards.length) return [];
    switch (filterKey) {
      case "active":
        return userCards.filter((card) =>
          ["active", "normal"].includes(String(card?.status || "").toLowerCase()),
        );
      case "virtual":
        return userCards.filter((card) =>
          normalizeCardType(card?.card_type || card?.type)
            .toLowerCase()
            .includes("virtual"),
        );
      case "physical":
        return userCards.filter((card) =>
          normalizeCardType(card?.card_type || card?.type)
            .toLowerCase()
            .includes("physical"),
        );
      default:
        return userCards;
    }
  };

  const openOverviewMetricModal = (metric) => {
    const rows = getMetricCardsRows(metric?.filterKey);
    setOverviewModal({
      open: true,
      title: metric?.title || "Cards",
      subtitle: metric?.subtitle || "Cards list",
      rows,
    });
  };

  const toggleWalletBalanceVisibility = () => {
    setWalletBalanceUnlocked((previous) => !previous);
  };

  return (
    <>
      <div className="row">
        <div className="col-xl-12">
          <div className="payment-bx nova-dashboard-clean">
            <div className="d-flex justify-content-between flex-wrap">
              <div className="payment-content">
                <h1 className="font-w500 mb-2">Good morning, {userName}</h1>
                <p className="dz-para">
                  {roleLabel} | {userEmail} | {userPhone}
                </p>
                {/* <div className="d-flex flex-wrap gap-2">
                  <span className="badge badge-sm bg-primary">
                    Tevau Status: {tevauStatus}
                  </span>
                  <span className="badge badge-sm bg-info">
                    User Code: {userCode || "N/A"}
                  </span>
                </div> */}
              </div>
              <div className="mb-4 mb-xl-0">
                <button
                  type="button"
                  className="btn btn-primary me-3"
                  onClick={() => setMakePayment(true)}
                >
                  Make a payment
                </button>
                <button
                  type="button"
                  className="btn btn-white"
                  onClick={() => setWithdrowModal(true)}
                >
                  Withdraw
                </button>
              </div>
            </div>
            <div className="row g-3">
              <div className="col-12">
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
                        <circle
                          cx="42.7722"
                          cy="19.2278"
                          r="19.2278"
                          fill="white"
                          fillOpacity="0.2"
                        />
                        <circle
                          cx="19.2278"
                          cy="19.2278"
                          r="19.2278"
                          fill="white"
                          fillOpacity="0.2"
                        />
                      </svg>
                    </div>
                    <button type="button" className="modal-btn">
                      <span
                        className="dz-wallet icon-box icon-box-lg m-auto mb-1 d-block"
                        onClick={() => setCardModal(true)}
                      >
                        {SVGICON.transferSvg}
                      </span>
                      <span>Transfer </span>
                    </button>
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
                            : formatProtectedCurrency(
                                walletBalanceToShow,
                                walletCurrency,
                              )}
                        </h2>
                        <button
                          type="button"
                          className="nova-sec-visibility-toggle nova-sec-visibility-inline"
                          onClick={toggleWalletBalanceVisibility}
                          aria-label={balanceToggleLabel}
                          title={balanceToggleLabel}
                        >
                          <i
                            className={`pi ${
                              walletBalanceUnlocked ? "pi-eye-slash" : "pi-eye"
                            }`}
                          />
                        </button>
                      </div>
                      <span>
                        {userCardsLoading
                          ? "Cards loading..."
                          : `${activeCardCount} active of ${userCards.length} cards`}
                      </span>
                      <div className="nova-wallet-stats">
                        <span className="nova-wallet-stat-chip">
                          Asset: {walletAssetName}
                        </span>
                        <span className="nova-wallet-stat-chip">
                          Currency:{" "}
                          {String(walletCurrency || "USD").toUpperCase()}
                        </span>
                        <span className="nova-wallet-stat-chip">
                          Status: {walletStatus}
                        </span>
                        <span className="nova-wallet-stat-chip">
                          Available:{" "}
                          {formatProtectedCurrency(
                            walletAvailableBalance,
                            walletCurrency,
                          )}
                        </span>
                        {walletLockedBalance !== null && (
                          <span className="nova-wallet-stat-chip">
                            Locked:{" "}
                            {formatProtectedCurrency(
                              walletLockedBalance,
                              walletCurrency,
                            )}
                          </span>
                        )}
                      </div>
                      <div className="nova-wallet-overview">
                        <span>
                          Deposits:{" "}
                          {formatProtectedCurrency(walletDeposits, walletCurrency)}
                        </span>
                        <span>
                          Withdrawals:{" "}
                          {formatProtectedCurrency(
                            walletWithdrawals,
                            walletCurrency,
                          )}
                        </span>
                        <span>Transactions: {walletTotalTransactions}</span>
                      </div>
                      {walletTxPreview.length > 0 && (
                        <div className="nova-wallet-quick-tx">
                          {walletTxPreview.map((txn) => (
                            <div
                              className="nova-wallet-quick-tx-item"
                              key={txn?.id || txn?.created_at}
                            >
                              <span className="text-capitalize">
                                {txn?.type || "txn"}{" "}
                                {txn?.network ? `(${txn.network})` : ""}
                              </span>
                              <strong>
                                {formatProtectedCurrency(
                                  txn?.amount || 0,
                                  walletCurrency,
                                )}
                              </strong>
                            </div>
                          ))}
                        </div>
                      )}
                      {userCardsError && !userCardsLoading && (
                        <span className="text-danger d-block mt-1">
                          {userCardsError}
                        </span>
                      )}
                      {walletError && !walletLoading && (
                        <span className="text-warning d-block mt-1">
                          {walletError}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12">
                <WalletDepositPanel />
              </div>
            </div>
          </div>
          <div className="row g-3">
            <div className="col-12">
              <div className="nova-cards-overview-board nova-dashboard-overview-board">
                <div className="nova-overview-stage-card nova-overview-stage-strip">
                    <div className="nova-overview-stage-main">
                      <div className="nova-overview-stage-head">
                        <span className="nova-overview-stage-title">
                          Payment Summary
                        </span>
                      </div>
                      <div className="nova-overview-stage-stats">
                      <strong>
                        {showWalletBalanceLoading
                          ? "Loading..."
                          : formatProtectedCurrency(
                              walletBalanceToShow,
                              walletCurrency,
                            )}
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
                        <i
                          className={`pi ${
                            walletBalanceUnlocked ? "pi-eye-slash" : "pi-eye"
                          }`}
                        />
                      </button>
                      <span />
                      <small>{userCards.length} Cards</small>
                    </div>
                  </div>
                  <div className="nova-overview-stage-cta">
                    <i className="pi pi-chart-line" />
                    Summary + stats synced from cards/wallet APIs
                  </div>
                </div>
                <div className="nova-overview-horizontal-scroll">
                  <div className="nova-overview-metric-grid nova-overview-metric-grid-horizontal">
                    {overviewMetrics.map((metric) => (
                      <div
                        className={`nova-overview-metric-card ${metric.tone}`}
                        key={metric.title}
                      >
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
                          onClick={() => openOverviewMetricModal(metric)}
                          aria-label={`Open ${metric.title} cards`}
                        >
                          <i className="pi pi-angle-right" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
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
                          {formatProtectedCurrency(
                            walletWithdrawals,
                            walletCurrency,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card-body pt-2 custome-tooltip pb-0">
                  <ProjectAreaChart
                    series={projectChartSeries}
                    categories={WEEKDAY_LABELS}
                  />
                </div>
              </div>
              <LastestTransaction
                rows={latestTransactionRows}
                loading={walletLoading}
                error={walletError}
              />
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
                      <div
                        className="d-flex align-items-center mb-2"
                        key={item.label}
                      >
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
                        <span className="text-primary font-w700 ms-auto">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card-body pt-0 pb-0 px-3">
                  <h6 className="mb-2">Transactions by Weekday</h6>
                  <div id="columnChart1" className="chartjs">
                    <BarWeeklySummary
                      series={transactionBarSeries}
                      categories={WEEKDAY_LABELS}
                    />
                  </div>
                </div>
              </div>
              <div className="card h-auto">
                <div className="card-body">
                  <h4 className="fs-20 mb-1 mt-0">Card Status Breakdown</h4>
                  <span className="text-muted">
                    Distribution from cards status API data.
                  </span>
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
                        <li
                          className="d-flex align-items-center mb-2"
                          key={item.label}
                        >
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
            <h5 className="modal-title">{overviewModal.title || "Cards"}</h5>
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
                {!overviewModal.rows.length ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">
                      No cards found for this selection.
                    </td>
                  </tr>
                ) : (
                  overviewModal.rows.map((card, index) => {
                    const boundRaw = String(card?.is_bound || "").toLowerCase();
                    const boundLabel =
                      typeof card?.is_bound === "boolean"
                        ? card.is_bound
                          ? "Yes"
                          : "No"
                        : boundRaw === "1" || boundRaw === "true" || boundRaw === "yes"
                          ? "Yes"
                          : boundRaw === "0" || boundRaw === "false" || boundRaw === "no"
                            ? "No"
                            : "N/A";

                    return (
                      <tr key={`overview-card-${String(card?.id ?? card?.card_id ?? index)}`}>
                        <td>{card?.card_id || card?.id || "N/A"}</td>
                        <td>{normalizeCardType(card?.card_type || card?.type)}</td>
                        <td>{normalizeStatus(card?.status)}</td>
                        <td>
                          {formatCurrencyValue(
                            card?.balance,
                            card?.currency || walletCurrency || "USD",
                          )}
                        </td>
                        <td>{boundLabel}</td>
                        <td>{formatDateTime(card?.created_at)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
      <Modal
        id="exampleModal1"
        show={makePayment}
        onHide={setMakePayment}
        centered
      >
        <div className="modal-header">
          <h5 className="modal-title">Make Payment</h5>
          <button
            type="button"
            className="btn-close"
            onClick={() => setMakePayment(false)}
          ></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Seller Mobile Number</label>
            <input
              type="number"
              className="form-control mb-3"
              id="exampleInputEmail1"
              placeholder="Number"
            />
            <label className="form-label">product Name</label>
            <input
              type="email"
              className="form-control mb-3"
              id="exampleInputEmail2"
              placeholder=" Name"
            />
            <label className="form-label">Amount</label>
            <input
              type="number"
              className="form-control mb-3"
              id="exampleInputEmail3"
              placeholder="Amount"
            />
          </div>
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-danger light"
            onClick={() => setMakePayment(false)}
          >
            Close
          </button>
          <button type="button" className="btn btn-primary">
            Save changes
          </button>
        </div>
      </Modal>
      <Modal centered show={withdrowModal} onHide={setWithdrowModal}>
        <div className="modal-header">
          <h5 className="modal-title">Make Payment</h5>
          <button
            type="button"
            className="btn-close"
            onClick={() => setWithdrowModal(false)}
          ></button>
        </div>
        <div className="modal-body">
          <label className="form-label">Payment method</label>
          <div>
            <Select
              options={options}
              isSearchable={false}
              className="custom-react-select mb-3 mb-xxl-0"
            />
          </div>
          <label className="form-label">Amount</label>
          <input
            type="email"
            className="form-control mb-3"
            id="exampleInputEmail4"
            placeholder="Rupee"
          />
          <label className="form-label">Card Holder Name</label>
          <input
            type="email"
            className="form-control mb-3"
            id="exampleInputEmail5"
            placeholder="Amount"
          />
          <label className="form-label">Card Name</label>
          <input
            type="email"
            className="form-control mb-3"
            id="exampleInputEmail6"
            placeholder="Amount"
          />
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-danger light"
            onClick={() => setWithdrowModal(false)}
          >
            Close
          </button>
          <button type="button" className="btn btn-primary">
            Save changes
          </button>
        </div>
      </Modal>
      <Modal centered show={cardModal} onHide={setCardModal}>
        <div className="modal-header ">
          <h5 className="modal-title">Enter Debit or Credit card Details</h5>
          <button
            type="button"
            className="btn-close"
            onClick={() => setCardModal(false)}
          ></button>
        </div>
        <div className="modal-body">
          <label className="form-label">Card Number</label>
          <input
            type="number"
            className="form-control mb-3"
            id="exampleInputEmail7"
            placeholder="card no."
          />
          <label className="form-label">Expiry/Validity</label>
          <input
            type="number"
            className="form-control mb-3"
            id="exampleInputEmail8"
            placeholder="Year/Month"
          />
          <label className="form-label">CVV</label>
          <input
            type="number"
            className="form-control mb-3"
            id="exampleInputEmail9"
            placeholder="123"
          />
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-danger light"
            onClick={() => setCardModal(false)}
          >
            Close
          </button>
          <button type="button" className="btn btn-primary">
            Save changes
          </button>
        </div>
      </Modal>
    </>
  );
}

const Home = () => {
  const {
    changeBackground,
    chnageSidebarColor,
    setHeaderIcon,
    changeNavigationHader,
  } = useContext(ThemeContext);
  const { user, refreshUser } = useContext(AuthContext);
  const hasAppliedThemeRef = useRef(false);
  const hasRefreshedUserRef = useRef(false);

  useEffect(() => {
    if (hasAppliedThemeRef.current) return;
    hasAppliedThemeRef.current = true;
    changeBackground({ value: "light", label: "Light" });
    changeNavigationHader("color_2");
    chnageSidebarColor("color_2");
    setHeaderIcon(true);
  }, [
    changeBackground,
    changeNavigationHader,
    chnageSidebarColor,
    setHeaderIcon,
  ]);

  useEffect(() => {
    if (hasRefreshedUserRef.current) return;
    hasRefreshedUserRef.current = true;
    refreshUser();
  }, [refreshUser]);

  return (
    <>
      <CommandPage user={user} />
    </>
  );
};

export default Home;
