import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "react-bootstrap";

import DashboardActionHeader from "../../elements/dashboard/DashboardActionHeader";
import WalletSummaryCard from "../../elements/dashboard/WalletSummaryCard";
import OverviewMetricsBoard from "../../elements/dashboard/OverviewMetricsBoard";
import DashboardChartsPanel from "../../elements/dashboard/DashboardChartsPanel";
import OverviewCardsModal from "../../elements/dashboard/OverviewCardsModal";
import WithdrawModal from "../../elements/Modals/WithdrawModal";
import TransferModal from "../../elements/Modals/TransferModal";
import { ThemeContext } from "../../../context/ThemeContext";
import { AuthContext } from "../../../context/authContext";
import {
  getAllDashboardCards,
  getDashboardWalletBalance,
} from "../../../services/dashboardWallet";
import {
  formatCurrencyValue,
  formatDashboardDate,
  formatDateTime,
  getTransactionRawAmount,
  getTransactionTimestamp,
  getWeekdayIndex,
  isWalletAssetUsable,
  normalizeCardType,
  normalizeStatus,
  toSafeNumber,
} from "../../../utils";
import { useNavigate } from "react-router-dom";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CommandPage({ user }) {
  const navigate = useNavigate();
  const [walletDepositModal, setWalletDepositModal] = useState(false);
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
  const [transferModal, setTransferModal] = useState(false);
  const userName = user?.name || "User";
  const userEmail = user?.email || "N/A";
  const userPhone = user?.phone || "N/A";
  const userCode = user?.tevau_user?.user_code || null;
  const thirdId = user?.tevau_user?.third_id || null;

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
        const rows = await getAllDashboardCards();
        const filteredRows = rows.filter((row) => {
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
          setUserCards(filteredRows);
        }
      } catch (error) {
        if (mounted) {
          setUserCards([]);
          setUserCardsError("failed to load cards");
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
        const { assets, statistics, recentTransactions } =
          await getDashboardWalletBalance({
            userCode,
            thirdId,
            userId: user?.id,
          });

        if (mounted) {
          setWalletAssets(assets);
          setWalletStatistics(statistics);
          setWalletTransactions(recentTransactions);

          if (!assets.length) {
            setWalletError("Getting Error in fetching wallet details.");
          }
        }
      } catch (error) {
        if (mounted) {
          setWalletAssets([]);
          setWalletStatistics(null);
          setWalletTransactions([]);
          setWalletError("Getting Error in fetching wallet details.");
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
        txn?.type ||
          txn?.action ||
          txn?.transaction_type ||
          txn?.category ||
          "",
      ).toLowerCase();
      const isOutflowByType =
        /(withdraw|purchase|debit|charge|fee|payment|transfer_out|out)/.test(
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
        const status = normalizeStatus(
          txn?.status || txn?.state || "Processed",
        );

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
          ["active", "normal"].includes(
            String(card?.status || "").toLowerCase(),
          ),
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

  const closeWithdrawModal = () => {
    setWithdrowModal(false);
  };

  const closeWalletDepositModal = () => {
    setWalletDepositModal(false);
  };

  return (
    <>
      <div className="row">
        <div className="col-xl-12">
          <div className="payment-bx nova-dashboard-clean">
            <DashboardActionHeader
              userName={userName}
              userEmail={userEmail}
              userPhone={userPhone}
              onClickDeposit={() => navigate("/wallet")}
              onOpenTransfer={() => setTransferModal(true)}
              onOpenWithdraw={() => setWithdrowModal(true)}
            />
            <div className="row g-3">
              <div className="col-12">
                <WalletSummaryCard
                  walletCurrency={walletCurrency}
                  showWalletBalanceLoading={showWalletBalanceLoading}
                  walletBalanceToShow={walletBalanceToShow}
                  formatProtectedCurrency={formatProtectedCurrency}
                  walletBalanceUnlocked={walletBalanceUnlocked}
                  toggleWalletBalanceVisibility={toggleWalletBalanceVisibility}
                  balanceToggleLabel={balanceToggleLabel}
                  userCardsLoading={userCardsLoading}
                  activeCardCount={activeCardCount}
                  userCardsCount={userCards.length}
                  walletAssetName={walletAssetName}
                  walletStatus={walletStatus}
                  walletAvailableBalance={walletAvailableBalance}
                  walletLockedBalance={walletLockedBalance}
                  walletDeposits={walletDeposits}
                  walletWithdrawals={walletWithdrawals}
                  walletTotalTransactions={walletTotalTransactions}
                  walletTxPreview={walletTxPreview}
                  userCardsError={userCardsError}
                  walletError={walletError}
                />
              </div>
            </div>
          </div>
          <div className="row g-3">
            <div className="col-12">
              <OverviewMetricsBoard
                showWalletBalanceLoading={showWalletBalanceLoading}
                walletBalanceToShow={walletBalanceToShow}
                walletCurrency={walletCurrency}
                formatProtectedCurrency={formatProtectedCurrency}
                walletBalanceUnlocked={walletBalanceUnlocked}
                toggleWalletBalanceVisibility={toggleWalletBalanceVisibility}
                balanceToggleLabel={balanceToggleLabel}
                userCardsCount={userCards.length}
                overviewMetrics={overviewMetrics}
                onOpenMetric={openOverviewMetricModal}
              />
            </div>
          </div>
          <DashboardChartsPanel
            walletDeposits={walletDeposits}
            walletWithdrawals={walletWithdrawals}
            walletCurrency={walletCurrency}
            formatProtectedCurrency={formatProtectedCurrency}
            projectChartSeries={projectChartSeries}
            latestTransactionRows={latestTransactionRows}
            walletLoading={walletLoading}
            walletError={walletError}
            cardTypeChartItems={cardTypeChartItems}
            transactionBarSeries={transactionBarSeries}
            weekdayLabels={WEEKDAY_LABELS}
            cardStatusChartItems={cardStatusChartItems}
          />
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
        <OverviewCardsModal
          overviewModal={overviewModal}
          onClose={() =>
            setOverviewModal({ open: false, title: "", subtitle: "", rows: [] })
          }
          normalizeCardType={normalizeCardType}
          normalizeStatus={normalizeStatus}
          formatCurrencyValue={formatCurrencyValue}
          formatDateTime={formatDateTime}
          walletCurrency={walletCurrency}
        />
      </Modal>
      <WithdrawModal show={withdrowModal} onHide={closeWithdrawModal} />
      <TransferModal
        show={transferModal}
        onHide={() => setTransferModal(false)}
      />
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
