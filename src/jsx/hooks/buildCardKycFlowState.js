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
        "Wallet access is available after KYC approval.",
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
        "Wallet access becomes available after KYC approval.",
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
      canAccessWallet: true,
      title: "Buy Your First Card",
      message:
        "KYC is approved. You can deposit funds and order your first card.",
      orderBlockedReason: "",
      bindBlockedReason:
        "Buy the first card before opening the bind flow for additional card actions.",
      walletBlockedReason: "",
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
