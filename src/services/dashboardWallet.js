import { request } from "../utils/api";

const ROOT_API_BASE_URL = "https://nova.innovationpixel.com/public/api/";

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
