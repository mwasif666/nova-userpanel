import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../../context/authContext";
import { request } from "../../utils/api";

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

const filterCardsForUser = (rows, user) => {
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

const dedupeCards = (rows) =>
  Array.from(
    new Map(
      rows.map((row, index) => [String(row?.id ?? row?.card_id ?? `row-${index}`), row]),
    ).values(),
  );

const usePurchasedCardAccess = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasPurchasedCard, setHasPurchasedCard] = useState(false);

  const userKey = useMemo(
    () => [user?.id, user?.tevau_user?.user_code, user?.tevau_user?.third_id].join(":"),
    [user?.id, user?.tevau_user?.third_id, user?.tevau_user?.user_code],
  );

  const loadCardAccess = useCallback(async () => {
    if (!user?.id && !user?.tevau_user?.user_code && !user?.tevau_user?.third_id) {
      setHasPurchasedCard(false);
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
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
          ...pageResponses.flatMap((pageResponse) => extractCardsRows(pageResponse).rows),
        ];
      }

      const userCards = filterCardsForUser(dedupeCards(rows), user);
      setHasPurchasedCard(userCards.length > 0);
    } catch (error) {
      setHasPurchasedCard(false);
      setError("Failed to load card access.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCardAccess();
  }, [loadCardAccess, userKey]);

  return {
    loading,
    error,
    hasPurchasedCard,
    refresh: loadCardAccess,
  };
};

export default usePurchasedCardAccess;
