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

      const normalized = list.map((item) => ({
        value: item.network,
        label: item.name,
        withdrawal_fee: item.withdrawal_fee,
        min_withdrawal: item.min_withdrawal,
      }));

      setNetworks(normalized);
    } catch (error) {
      setNetworkError(
        getApiErrorMessage(error, "Failed to load withdrawal networks.")
      );
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
        <CardAccessNotice
          title={flowTitle}
          message={walletBlockedReason}
        />
      ) : (
      <div className="row g-3">
        <div className="col-12">
          <div className="card nova-panel h-100">
            <div className="card-body">

              <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-2 mb-3">
                <div>
                  <div className="nova-flow-kicker mb-1">Wallet</div>
                  <h5 className="mb-0">Supported Networks</h5>
                </div>

                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={loadNetworks}
                  disabled={loadingNetworks}
                >
                  {loadingNetworks ? "Refreshing..." : "Refresh Networks"}
                </button>
              </div>

              {networkError && (
                <div className="alert alert-warning py-2">
                  {networkError}
                </div>
              )}

              {networks.length > 0 && (
                <div className="nova-bind-helper mb-0">
                  <div className="nova-bind-helper-list">
                    {networks.map((item) => (
                      <span key={item.value}>{item.label}</span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
        <div className="col-12">
          <div
            className="nova-flow-switch"
            role="tablist"
            aria-label="Wallet tabs"
          >
            <button
              type="button"
              className={`nova-flow-switch-btn ${
                activeTab === "addresses" ? "is-active" : ""
              }`}
              onClick={() => setActiveTab("addresses")}
            >
              <span className="nova-flow-switch-title">
                Deposit Addresses
              </span>
            </button>

            <button
              type="button"
              className={`nova-flow-switch-btn ${
                activeTab === "binance" ? "is-active" : ""
              }`}
              onClick={() => setActiveTab("binance")}
            >
              <span className="nova-flow-switch-title">Binance Pay</span>
            </button>
          </div>
        </div>
        {activeTab === "addresses" && (
          <div className="col-12">
            <WalletDepositAddressesPanel networks={networks} />
          </div>
        )}

        {activeTab === "binance" && (
          <div className="col-12">
            <WalletBinancePayPanel networks={networks} />
          </div>
        )}

      </div>
      )}
    </>
  );
};

export default Wallet;
