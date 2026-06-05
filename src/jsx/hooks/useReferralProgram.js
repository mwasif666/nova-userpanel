import { useCallback, useEffect, useState } from "react";
import {
  createEmptyReferralState,
  fetchReferralProgram,
} from "../../services/referral";

const useReferralProgram = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(createEmptyReferralState);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const nextData = await fetchReferralProgram();
      setData(nextData);
      return nextData;
    } catch {
      setData(createEmptyReferralState());
      setError("Failed to load invite details.");
      return createEmptyReferralState();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  return {
    loading,
    error,
    data,
    refresh,
  };
};

export default useReferralProgram;
