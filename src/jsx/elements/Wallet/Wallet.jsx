import { useEffect, useState } from "react";
import { getApiErrorMessage } from "../../../utils";
import { request } from "../../../utils/api";
import PageTitle from "../../layouts/PageTitle";
import CardAccessNotice from "../../components/CardAccessNotice";
import useCardKycFlow from "../../hooks/useCardKycFlow";
import WalletBinancePayPanel from "./WalletBinancePayPanel";
import WalletDepositAddressesPanel from "./WalletDepositAddressesPanel";

const Wallet = () => {
  const {
    canAccessWallet,
    loading: cardFlowLoading,
    title: flowTitle,
    walletBlockedReason,
  } = useCardKycFlow();
  const [activeTab, setActiveTab] = useState("addresses");

  const [networks, setNetworks] = useState([]);
  const [loadingNetworks, setLoadingNetworks] = useState(false);
  const [networkError, setNetworkError] = useState("");

  const loadNetworks = async () => {
    setNetworkError("");
    try {
      setLoadingNetworks(true);
      const res = await request({
        url: "app/usdt/wallet/withdrawal-networks",
        method: "GET",
      });
      const list = res?.data?.networks || [];
      setNetworks(
        list.map((item) => ({
          value: item.network,
          label: item.name,
          withdrawal_fee: item.withdrawal_fee,
          min_withdrawal: item.min_withdrawal,
        }))
      );
    } catch (error) {
      setNetworkError(getApiErrorMessage(error, "Failed to load withdrawal networks."));
    } finally {
      setLoadingNetworks(false);
    }
  };

  useEffect(() => {
    loadNetworks();
  }, []);

  return (
    <>
      <PageTitle motherMenu="Wallet" activeMenu="Wallet" />

      {!cardFlowLoading && !canAccessWallet ? (
        <CardAccessNotice title={flowTitle} message={walletBlockedReason} />
      ) : (
        <div className="nova-wallet-page">
          {/* Header */}
          <div className="nova-wallet-page-head">
            <div>
              <div className="nova-flow-kicker mb-1">Crypto Wallet</div>
              <h4 className="mb-0">Deposit</h4>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              {networks.length > 0 && (
                <div className="nova-wallet-network-chips">
                  {networks.map((item) => (
                    <span key={item.value} className="nova-wallet-network-chip">
                      {item.label}
                    </span>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={loadNetworks}
                disabled={loadingNetworks}
              >
                <i className="pi pi-refresh me-1" />
                {loadingNetworks ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>

          {networkError && (
            <div className="nova-kyc-feedback is-error mb-3">
              <i className="fa fa-exclamation-circle" />
              <span>{networkError}</span>
            </div>
          )}

          {/* Tabs */}
          <div className="nova-wallet-tabs">
            <button
              type="button"
              className={`nova-wallet-tab-btn ${activeTab === "addresses" ? "is-active" : ""}`}
              onClick={() => setActiveTab("addresses")}
            >
              <i className="pi pi-wallet me-2" />
              Deposit Addresses
            </button>
            <button
              type="button"
              className={`nova-wallet-tab-btn ${activeTab === "binance" ? "is-active" : ""}`}
              onClick={() => setActiveTab("binance")}
            >
              <i className="pi pi-credit-card me-2" />
              Binance Pay
            </button>
          </div>

          {/* Panel */}
          <div className="nova-wallet-panel">
            {activeTab === "addresses" && (
              <WalletDepositAddressesPanel networks={networks} />
            )}
            {activeTab === "binance" && (
              <WalletBinancePayPanel networks={networks} />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Wallet;
