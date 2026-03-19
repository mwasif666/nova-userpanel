import { useCallback, useEffect, useMemo, useState } from "react";
import { request } from "../../utils/api";

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

const sortByLatest = (rows = []) =>
  [...rows].sort((a, b) => {
    const aTime = new Date(
      a?.submitted_at || a?.updated_at || a?.created_at || 0,
    ).getTime();
    const bTime = new Date(
      b?.submitted_at || b?.updated_at || b?.created_at || 0,
    ).getTime();
    return bTime - aTime;
  });

const dedupeById = (rows = []) =>
  Array.from(
    new Map(
      rows.map((row, index) => [String(row?.id ?? `kyc-${index}`), row]),
    ).values(),
  );

const normalizeStatusLabel = (value) => {
  if (!value) return "Not Submitted";

  return String(value)
    .replace(/[_-]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const useKycApprovalStatus = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [kycRows, setKycRows] = useState([]);

  const loadKycStatus = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
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
          ...pageResponses.flatMap((pageResponse) => extractKycRows(pageResponse).rows),
        ];
      }

      setKycRows(dedupeById(rows));
    } catch (fetchError) {
      setKycRows([]);
      setError("Failed to load KYC status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKycStatus().catch(() => undefined);
  }, [loadKycStatus]);

  const sortedKycRows = useMemo(() => sortByLatest(kycRows), [kycRows]);

  const approvedKyc = useMemo(
    () =>
      sortedKycRows.find(
        (item) => String(item?.status || "").toLowerCase().trim() === "approved",
      ) || null,
    [sortedKycRows],
  );

  const latestKyc = sortedKycRows[0] || null;
  const displayKyc = approvedKyc || latestKyc;
  const statusKey = String(displayKyc?.status || "")
    .toLowerCase()
    .trim();

  return {
    loading,
    error,
    kycRows: sortedKycRows,
    latestKyc,
    approvedKyc,
    displayKyc,
    hasSubmittedKyc: sortedKycRows.length > 0,
    isApproved: statusKey === "approved",
    statusKey,
    statusLabel: normalizeStatusLabel(displayKyc?.status),
    refresh: loadKycStatus,
  };
};

export default useKycApprovalStatus;
