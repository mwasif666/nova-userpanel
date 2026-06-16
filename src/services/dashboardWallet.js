import { request } from "../utils/api";

const ROOT_API_BASE_URL = "https://backend.novacrest.io/api/";
const EMPTY_LIMITS_GROUP = Object.freeze({
  perTransaction: null,
  daily: null,
  monthly: null,
  yearly: null,
});

export const createEmptyCardLimits = () => ({
  nonAtm: { ...EMPTY_LIMITS_GROUP },
  atm: { ...EMPTY_LIMITS_GROUP },
});

const normalizeQuotaValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildLimitsGroup = (source = {}) => ({
  perTransaction: normalizeQuotaValue(source?.tradeQuotaAmt),
  daily: normalizeQuotaValue(source?.dayQuotaAmt),
  monthly: normalizeQuotaValue(source?.monthQuotaAmt),
  yearly: normalizeQuotaValue(source?.yearQuotaAmt),
});

export const normalizeCardTransactionLimits = (response) => {
  const rows = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response?.data?.data)
      ? response.data.data
      : [];
  const primary = rows[0] && typeof rows[0] === "object" ? rows[0] : {};
  const normalized = buildLimitsGroup(primary);

  // Current API returns a single quota object. Apply same quotas to both groups
  // so the UI remains consistent and ready for future per-channel quotas.
  return {
    nonAtm: { ...normalized },
    atm: { ...normalized },
  };
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

export const getAllDashboardCards = async () => {
  const firstPageResponse = await request({
    url: "app/tevau/cards",
    method: "GET",
  });

  const firstPageResult = extractCardsRows(firstPageResponse);
  let rows = firstPageResult.rows;

  if (firstPageResult.lastPage > 1) {
    const pageRequests = Array.from(
      { length: firstPageResult.lastPage - 1 },
      (_, index) =>
        request({
          url: `app/tevau/cards?page=${index + 2}`,
          method: "GET",
        }),
    );

    const pageResponses = await Promise.all(pageRequests);
    const extraRows = pageResponses.flatMap(
      (pageResponse) => extractCardsRows(pageResponse).rows,
    );
    rows = [...rows, ...extraRows];
  }

  return Array.from(
    new Map(
      rows.map((row, index) => [
        String(row?.id ?? row?.card_id ?? `row-${index}`),
        row,
      ]),
    ).values(),
  );
};

export const getDashboardWalletBalance = async ({ userCode, thirdId, userId }) => {
  const response = await request({
    url: "wallet/balance",
    method: "GET",
    baseURL: ROOT_API_BASE_URL,
    data: {
      ...(userCode ? { user_code: userCode } : {}),
      ...(thirdId ? { third_id: thirdId } : {}),
      ...(userId ? { user_id: userId } : {}),
    },
  });

  const payload = response?.data ?? {};
  return {
    assets: Array.isArray(payload?.assets) ? payload.assets : [],
    statistics:
      payload?.statistics && typeof payload.statistics === "object"
        ? payload.statistics
        : null,
    recentTransactions: Array.isArray(payload?.recent_transactions)
      ? payload.recent_transactions
      : [],
  };
};

export const getCardTransactionLimits = async (cardId) => {
  const safeCardId = String(cardId || "").trim();
  if (!safeCardId) {
    throw new Error("Card id is required to fetch limits.");
  }

  const response = await request({
    url: `app/tevau/cards/${safeCardId}/limits`,
    method: "GET",
  });

  return normalizeCardTransactionLimits(response);
};

const normalizePinValue = (payload = {}) => {
  const candidates = [
    payload?.pin,
    payload?.atm_pin,
    payload?.atmPin,
    payload?.pin_code,
    payload?.pinCode,
    payload?.withdraw_password,
    payload?.withdrawPassword,
    payload?.withdrawal_password,
    payload?.withdrawalPassword,
    payload?.atm_withdrawal_password,
    payload?.atmWithdrawalPassword,
    payload?.transaction_password,
    payload?.transactionPassword,
    payload?.pan,
    payload?.pan_password,
    payload?.panPassword,
    payload?.password,
    payload?.pwd,
    payload?.passcode,
  ];

  const raw = candidates.find(
    (value) =>
      value !== null && value !== undefined && String(value).trim() !== "",
  );

  return String(raw || "").trim();
};

const findPinLikeValueDeep = (source, depth = 0) => {
  if (!source || depth > 5) return "";

  if (Array.isArray(source)) {
    for (let index = 0; index < source.length; index += 1) {
      const found = findPinLikeValueDeep(source[index], depth + 1);
      if (found) return found;
    }
    return "";
  }

  if (typeof source !== "object") return "";

  const rejectKeyPattern =
    /(card_number|cardnumber|cvv|cvc|expiry|expire|monthquota|dayquota|tradequota|yearquota|quota|limit)/i;
  const acceptKeyPattern = /(pin|password|passcode|withdraw)/i;

  const entries = Object.entries(source);
  for (let index = 0; index < entries.length; index += 1) {
    const [rawKey, value] = entries[index];
    const key = String(rawKey || "");

    if (
      acceptKeyPattern.test(key) &&
      !rejectKeyPattern.test(key) &&
      (typeof value === "string" || typeof value === "number")
    ) {
      const candidate = String(value || "").trim();
      if (candidate) return candidate;
    }

    if (value && typeof value === "object") {
      const nested = findPinLikeValueDeep(value, depth + 1);
      if (nested) return nested;
    }
  }

  return "";
};

export const getCardPinDetails = async (cardId) => {
  const safeCardId = String(cardId || "").trim();
  if (!safeCardId) {
    throw new Error("Card id is required to fetch PIN details.");
  }

  const response = await request({
    url: `app/tevau/cards/${safeCardId}/pan`,
    method: "GET",
  });
  return response.data.card_number;
};
 