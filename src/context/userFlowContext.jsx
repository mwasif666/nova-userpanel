import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AuthContext } from "./authContext";
import { buildCardKycFlowState } from "../jsx/hooks/buildCardKycFlowState";
import {
  clearUserFlowCache,
  deriveKycState,
  fetchKycRecords,
  fetchUserCards,
  filterCardsForUser,
  hasUserIdentity,
  readCardAccessCache,
  readKycCache,
  writeCardAccessCache,
  writeKycCache,
} from "../services/userFlow";

export const UserFlowContext = createContext(null);

const INITIAL_KYC_STATE = {
  kycRows: [],
  latestKyc: null,
  approvedKyc: null,
  displayKyc: null,
  hasSubmittedKyc: false,
  isApproved: false,
  statusKey: "",
  statusLabel: "Not Submitted",
};

const createRequestGate = () => {
  let kycPromise = null;
  let cardsPromise = null;

  return {
    runKyc: (runner) => {
      if (!kycPromise) {
        kycPromise = runner().finally(() => {
          kycPromise = null;
        });
      }
      return kycPromise;
    },
    runCards: (runner) => {
      if (!cardsPromise) {
        cardsPromise = runner().finally(() => {
          cardsPromise = null;
        });
      }
      return cardsPromise;
    },
    reset: () => {
      kycPromise = null;
      cardsPromise = null;
    },
  };
};

export const UserFlowProvider = ({ children }) => {
  const { user, loading: authLoading, isAuthenticated } = useContext(AuthContext);

  const [kycLoading, setKycLoading] = useState(false);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [kycError, setKycError] = useState("");
  const [cardsError, setCardsError] = useState("");
  const [kycState, setKycState] = useState(INITIAL_KYC_STATE);
  const [hasPurchasedCard, setHasPurchasedCard] = useState(false);
  const [hydratedFromCache, setHydratedFromCache] = useState(false);

  const requestGateRef = useRef(createRequestGate());
  const bootstrappedUserRef = useRef(null);

  const userId = user?.id;

  const resetFlowState = useCallback(() => {
    requestGateRef.current.reset();
    bootstrappedUserRef.current = null;
    setKycState(INITIAL_KYC_STATE);
    setHasPurchasedCard(false);
    setKycError("");
    setCardsError("");
    setKycLoading(false);
    setCardsLoading(false);
    setHydratedFromCache(false);
    clearUserFlowCache();
  }, []);

  const applyKycRows = useCallback(
    (rows) => {
      const nextState = deriveKycState(rows);
      setKycState(nextState);

      if (userId) {
        writeKycCache(userId, nextState.kycRows);
      }

      return nextState;
    },
    [userId],
  );

  const applyCardAccess = useCallback(
    (value) => {
      setHasPurchasedCard(Boolean(value));

      if (userId) {
        writeCardAccessCache(userId, Boolean(value));
      }
    },
    [userId],
  );

  const refreshKyc = useCallback(
    async ({ silent = false } = {}) => {
      if (!hasUserIdentity(user)) {
        applyKycRows([]);
        setKycError("");
        return INITIAL_KYC_STATE;
      }

      if (!silent) {
        setKycLoading(true);
      }
      setKycError("");

      try {
        const rows = await requestGateRef.current.runKyc(fetchKycRecords);
        return applyKycRows(rows);
      } catch {
        applyKycRows([]);
        setKycError("Failed to load KYC status.");
        return INITIAL_KYC_STATE;
      } finally {
        if (!silent) {
          setKycLoading(false);
        }
      }
    },
    [applyKycRows, user],
  );

  const refreshCards = useCallback(
    async ({ silent = false } = {}) => {
      if (!hasUserIdentity(user)) {
        applyCardAccess(false);
        setCardsError("");
        return false;
      }

      if (!silent) {
        setCardsLoading(true);
      }
      setCardsError("");

      try {
        const rows = await requestGateRef.current.runCards(fetchUserCards);
        const userCards = filterCardsForUser(rows, user);
        const nextValue = userCards.length > 0;
        applyCardAccess(nextValue);
        return nextValue;
      } catch {
        applyCardAccess(false);
        setCardsError("Failed to load card access.");
        return false;
      } finally {
        if (!silent) {
          setCardsLoading(false);
        }
      }
    },
    [applyCardAccess, user],
  );

  const refreshAll = useCallback(
    async ({ silent = false } = {}) => {
      await Promise.all([
        refreshKyc({ silent }),
        refreshCards({ silent }),
      ]);
    },
    [refreshCards, refreshKyc],
  );

  const hydrateFromCache = useCallback(() => {
    if (!userId) return false;

    const cachedKycRows = readKycCache(userId);
    const cachedCardAccess = readCardAccessCache(userId);

    let hydrated = false;

    if (Array.isArray(cachedKycRows)) {
      applyKycRows(cachedKycRows);
      hydrated = true;
    }

    if (
      cachedCardAccess &&
      typeof cachedCardAccess.hasPurchasedCard === "boolean"
    ) {
      applyCardAccess(cachedCardAccess.hasPurchasedCard);
      hydrated = true;
    }

    if (hydrated) {
      setHydratedFromCache(true);
    }

    return hydrated;
  }, [applyCardAccess, applyKycRows, userId]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated() || !hasUserIdentity(user)) {
      resetFlowState();
      return;
    }

    if (bootstrappedUserRef.current === userId) {
      return;
    }

    bootstrappedUserRef.current = userId;
    const hasCachedSnapshot = hydrateFromCache();
    refreshAll({ silent: hasCachedSnapshot }).catch(() => undefined);
  }, [
    authLoading,
    hydrateFromCache,
    isAuthenticated,
    refreshAll,
    resetFlowState,
    user,
    userId,
  ]);

  const flow = useMemo(
    () =>
      buildCardKycFlowState({
        hasSubmittedKyc: kycState.hasSubmittedKyc,
        isKycApproved: kycState.isApproved,
        kycStatusLabel: kycState.statusLabel,
        hasPurchasedCard,
      }),
    [
      hasPurchasedCard,
      kycState.hasSubmittedKyc,
      kycState.isApproved,
      kycState.statusLabel,
    ],
  );

  const value = useMemo(
    () => ({
      ...flow,
      ...kycState,
      hasPurchasedCard,
      loading: kycLoading || cardsLoading,
      kycLoading,
      cardsLoading,
      error: kycError || cardsError || "",
      kycError,
      cardsError,
      hydratedFromCache,
      refreshKyc,
      refreshCards,
      refresh: refreshAll,
      resetFlowState,
    }),
    [
      cardsError,
      cardsLoading,
      flow,
      hasPurchasedCard,
      hydratedFromCache,
      kycError,
      kycLoading,
      kycState,
      refreshAll,
      refreshCards,
      refreshKyc,
      resetFlowState,
    ],
  );

  return (
    <UserFlowContext.Provider value={value}>
      {children}
    </UserFlowContext.Provider>
  );
};

export const useUserFlowContext = () => {
  const context = useContext(UserFlowContext);

  if (!context) {
    throw new Error("useUserFlowContext must be used within UserFlowProvider");
  }

  return context;
};
