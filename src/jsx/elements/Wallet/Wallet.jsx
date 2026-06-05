import { useEffect, useState } from "react";
import { getApiErrorMessage } from "../../../utils";
import { request } from "../../../utils/api";
import PageTitle from "../../layouts/PageTitle";
import WalletBinancePayPanel from "./WalletBinancePayPanel";
import WalletDepositAddressesPanel from "./WalletDepositAddressesPanel";

const Wallet = () => {
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

      <div className="nova-wallet-page">
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
              {loadingNetworks ? "Refreshing..." : "Refresh Networks"}
            </button>
          </div>
        </div>

        {networkError && (
          <div className="alert alert-danger mt-3" role="alert">
            {networkError}
          </div>
        )}

        <div className="nova-wallet-tabs mt-4">
          <button
            type="button"
            className={`nova-wallet-tab ${activeTab === "addresses" ? "is-active" : ""}`}
            onClick={() => setActiveTab("addresses")}
          >
            Deposit Addresses
          </button>
          <button
            type="button"
            className={`nova-wallet-tab ${activeTab === "binance" ? "is-active" : ""}`}
            onClick={() => setActiveTab("binance")}
          >
            Binance Pay
          </button>
        </div>

        {activeTab === "addresses" ? (
          <WalletDepositAddressesPanel networks={networks} />
        ) : (
          <WalletBinancePayPanel />
        )}
      </div>
    </>
  );
};

export default Wallet;
