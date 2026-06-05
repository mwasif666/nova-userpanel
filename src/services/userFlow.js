import { request } from "../utils/api";

const KYC_CACHE_KEY = "nova_user_flow_kyc_v1";
const CARD_CACHE_KEY = "nova_user_flow_cards_v1";

export const normalizeStatusLabel = (value) => {
  if (!value) return "Not Submitted";

  return String(value)
    .replace(/[_-]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export const sortByLatest = (rows = []) =>
  [...rows].sort((a, b) => {
    const aTime = new Date(
      a?.submitted_at || a?.updated_at || a?.created_at || 0,
    ).getTime();
    const bTime = new Date(
      b?.submitted_at || b?.updated_at || b?.created_at || 0,
    ).getTime();
    return bTime - aTime;
  });

export const dedupeById = (rows = [], idKey = "id") =>
  Array.from(
    new Map(
      rows.map((row, index) => [
        String(row?.[idKey] ?? row?.card_id ?? `row-${index}`),
        row,
      ]),
    ).values(),
  );

const extractKycRows = (response) => {
  const envelope = response && typeof response === "object" ? response : {};
  const page =
    envelope?.data && typeof envelope.data === "object" ? envelope.data : {};
  const rows = Array.isArray(page?.data) ? page.data : [];

  return {
    rows,
    lastPage: Number(page?.last_page || 1) || 1,
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

export const filterCardsForUser = (rows, user) => {
  const userId = user?.id;
  const userCode = user?.tevau_user?.user_code || null;
  const thirdId = user?.tevau_user?.third_id || null;

  return rows.filter((row) => {
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
};

export const deriveKycState = (kycRows = []) => {
  const sortedKycRows = sortByLatest(kycRows);
  const approvedKyc =
    sortedKycRows.find(
      (item) => String(item?.status || "").toLowerCase().trim() === "approved",
    ) || null;
  const latestKyc = sortedKycRows[0] || null;
  const displayKyc = approvedKyc || latestKyc;
  const statusKey = String(displayKyc?.status || "")
    .toLowerCase()
    .trim();

  return {
    kycRows: sortedKycRows,
    latestKyc,
    approvedKyc,
    displayKyc,
    hasSubmittedKyc: sortedKycRows.length > 0,
    isApproved: statusKey === "approved",
    statusKey,
    statusLabel: normalizeStatusLabel(displayKyc?.status),
  };
};

export const fetchKycRecords = async () => {
  const firstResponse = await request({
    url: "app/tevau/kyc",
    method: "GET",
    data: {
      page: 1,
      per_page: 50,
    },
  });

  const firstPage = extractKycRows(firstResponse);
  let rows = [...firstPage.rows];

  if (firstPage.lastPage > 1) {
    const pageRequests = Array.from(
      { length: firstPage.lastPage - 1 },
      (_, index) =>
        request({
          url: "app/tevau/kyc",
          method: "GET",
          data: {
            page: index + 2,
            per_page: 50,
          },
        }),
    );

    const pageResponses = await Promise.all(pageRequests);
    rows = [
      ...rows,
      ...pageResponses.flatMap(
        (pageResponse) => extractKycRows(pageResponse).rows,
      ),
    ];
  }

  return dedupeById(rows);
};

export const fetchUserCards = async () => {
  const firstResponse = await request({
    url: "app/tevau/cards",
    method: "GET",
  });

  const firstPage = extractCardsRows(firstResponse);
  let rows = [...firstPage.rows];

  if (firstPage.lastPage > 1) {
    const pageRequests = Array.from(
      { length: firstPage.lastPage - 1 },
      (_, index) =>
        request({
          url: `app/tevau/cards?page=${index + 2}`,
          method: "GET",
        }),
    );

    const pageResponses = await Promise.all(pageRequests);
    rows = [
      ...rows,
      ...pageResponses.flatMap((pageResponse) =>
        extractCardsRows(pageResponse).rows,
      ),
    ];
  }

  return dedupeById(rows);
};

const readCache = (key, userId) => {
  if (!userId) return null;

  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (String(parsed?.userId) !== String(userId)) return null;

    return parsed?.data ?? null;
  } catch {
    return null;
  }
};

const writeCache = (key, userId, data) => {
  if (!userId) return;

  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        userId: String(userId),
        updatedAt: Date.now(),
        data,
      }),
    );
  } catch {
    // Ignore quota / private mode errors.
  }
};

export const readKycCache = (userId) => readCache(KYC_CACHE_KEY, userId);
export const writeKycCache = (userId, kycRows) =>
  writeCache(KYC_CACHE_KEY, userId, kycRows);

export const readCardAccessCache = (userId) => readCache(CARD_CACHE_KEY, userId);
export const writeCardAccessCache = (userId, hasPurchasedCard) =>
  writeCache(CARD_CACHE_KEY, userId, { hasPurchasedCard });

export const clearUserFlowCache = () => {
  sessionStorage.removeItem(KYC_CACHE_KEY);
  sessionStorage.removeItem(CARD_CACHE_KEY);
};

export const hasUserIdentity = (user) =>
  Boolean(
    user?.id || user?.tevau_user?.user_code || user?.tevau_user?.third_id,
  );
