import { useUserFlowContext } from "../../context/userFlowContext";

export { buildCardKycFlowState } from "./buildCardKycFlowState";

const useCardKycFlow = () => {
  const {
    refresh,
    refreshKyc,
    refreshCards,
    ...flow
  } = useUserFlowContext();

  return {
    ...flow,
    refresh,
    refreshKyc,
    refreshCards,
  };
};

export default useCardKycFlow;
