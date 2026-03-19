import { useMemo } from "react";
import useKycApprovalStatus from "./useKycApprovalStatus";
import usePurchasedCardAccess from "./usePurchasedCardAccess";

export const buildCardKycFlowState = ({
  hasSubmittedKyc = false,
  isKycApproved = false,
  kycStatusLabel = "Not Submitted",
  hasPurchasedCard = false,
} = {}) => {
  const normalizedKycStatus = String(kycStatusLabel || "Not Submitted");

  if (!hasSubmittedKyc) {
    return {
      stage: "kyc_required",
      hasSubmittedKyc: false,
      isKycApproved: false,
      hasPurchasedCard,
      canOrderCard: false,
      canBindCard: false,
      canAccessWallet: false,
      title: "Complete KYC First",
      message:
        "The user must submit and get KYC approved before card ordering becomes available.",
      orderBlockedReason:
        "Complete and approve KYC first. Card ordering unlocks after approval.",
      bindBlockedReason:
        "Complete and approve KYC first. Card binding unlocks after approval.",
      walletBlockedReason:
        "Wallet access is available after the first card is issued. Start with Profile and KYC.",
    };
  }

  if (!isKycApproved) {
    return {
      stage: "kyc_pending",
      hasSubmittedKyc: true,
      isKycApproved: false,
      hasPurchasedCard,
      canOrderCard: false,
      canBindCard: false,
      canAccessWallet: false,
      title: "KYC Approval Required",
      message: `Current KYC status is ${normalizedKycStatus}. Card ordering unlocks only after approval.`,
      orderBlockedReason: `Current KYC status is ${normalizedKycStatus}. Card ordering unlocks only after approval.`,
      bindBlockedReason: `Current KYC status is ${normalizedKycStatus}. Card binding unlocks only after approval.`,
      walletBlockedReason:
        "Wallet access becomes available after KYC approval and the first issued card.",
    };
  }

  if (!hasPurchasedCard) {
    return {
      stage: "eligible_to_buy",
      hasSubmittedKyc: true,
      isKycApproved: true,
      hasPurchasedCard: false,
      canOrderCard: true,
      canBindCard: false,
      canAccessWallet: false,
      title: "Buy Your First Card",
      message:
        "KYC is approved. The user can now order the first card. Wallet and bind flow unlock after the first card is issued.",
      orderBlockedReason: "",
      bindBlockedReason:
        "Buy the first card before opening the bind flow for additional card actions.",
      walletBlockedReason:
        "Wallet access unlocks after the first card is issued.",
    };
  }

  return {
    stage: "cardholder",
    hasSubmittedKyc: true,
    isKycApproved: true,
    hasPurchasedCard: true,
    canOrderCard: true,
    canBindCard: true,
    canAccessWallet: true,
    title: "Cards Unlocked",
    message:
      "KYC is approved and the user already has a card. Order, bind, and wallet flows are available.",
    orderBlockedReason: "",
    bindBlockedReason: "",
    walletBlockedReason: "",
  };
};

const useCardKycFlow = () => {
  const {
    loading: kycLoading,
    error: kycError,
    hasSubmittedKyc,
    isApproved: isKycApproved,
    statusLabel: kycStatusLabel,
    refresh: refreshKyc,
  } = useKycApprovalStatus();
  const {
    loading: cardsLoading,
    error: cardsError,
    hasPurchasedCard,
    refresh: refreshCards,
  } = usePurchasedCardAccess();

  const flow = useMemo(
    () =>
      buildCardKycFlowState({
        hasSubmittedKyc,
        isKycApproved,
        kycStatusLabel,
        hasPurchasedCard,
      }),
    [hasPurchasedCard, hasSubmittedKyc, isKycApproved, kycStatusLabel],
  );

  return {
    ...flow,
    loading: kycLoading || cardsLoading,
    kycLoading,
    cardsLoading,
    error: kycError || cardsError || "",
    kycError,
    cardsError,
    kycStatusLabel,
    refresh: async () => {
      await Promise.all([refreshKyc(), refreshCards()]);
    },
  };
};

export default useCardKycFlow;
