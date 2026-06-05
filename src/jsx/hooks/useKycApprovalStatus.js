import { useUserFlowContext } from "../../context/userFlowContext";

const useKycApprovalStatus = () => {
  const {
    loading: kycLoading,
    kycError: error,
    kycRows,
    latestKyc,
    approvedKyc,
    displayKyc,
    hasSubmittedKyc,
    isApproved,
    statusKey,
    statusLabel,
    refreshKyc: refresh,
  } = useUserFlowContext();

  return {
    loading: kycLoading,
    error,
    kycRows,
    latestKyc,
    approvedKyc,
    displayKyc,
    hasSubmittedKyc,
    isApproved,
    statusKey,
    statusLabel,
    refresh,
  };
};

export default useKycApprovalStatus;
