import { useUserFlowContext } from "../../context/userFlowContext";

const usePurchasedCardAccess = () => {
  const {
    cardsLoading: loading,
    cardsError: error,
    hasPurchasedCard,
    refreshCards: refresh,
  } = useUserFlowContext();

  return {
    loading,
    error,
    hasPurchasedCard,
    refresh,
  };
};

export default usePurchasedCardAccess;
