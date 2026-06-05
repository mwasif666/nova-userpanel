import CardAccessNotice from "../CardAccessNotice";
import useCardKycFlow from "../../hooks/useCardKycFlow";

const WalletAccessGate = ({ children }) => {
  const {
    canAccessWallet,
    loading,
    title,
    walletBlockedReason,
  } = useCardKycFlow();

  if (loading) {
    return children;
  }

  if (!canAccessWallet) {
    return <CardAccessNotice title={title} message={walletBlockedReason} />;
  }

  return children;
};

export default WalletAccessGate;
