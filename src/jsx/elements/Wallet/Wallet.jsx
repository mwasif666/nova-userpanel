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
  const [selectedNetwork, setSelectedNetwork] = useState("");

  const loadNetworks = async () => {
    setNetworkError("");
    try {
      setLoadingNetworks(true);
      const res = await request({
        url: "app/usdt/wallet/withdrawal-networks",
        method: "GET",
      });
      const list = res?.data?.networks || [];
      const mapped = list.map((item) => ({
        value: item.network,
        label: item.name,
        withdrawal_fee: item.withdrawal_fee,
        min_withdrawal: item.min_withdrawal,
      }));
      setNetworks(mapped);
      const preferred = mapped.find((n) => n.value === "TRC20")?.value || mapped[0]?.value || "";
      setSelectedNetwork(preferred);
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
      <PageTitle motherMenu="Home" motherMenuPath="/" activeMenu="Wallet" />

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
                  <button
                    key={item.value}
                    type="button"
                    className={`nova-wallet-network-chip ${selectedNetwork === item.value ? "is-active" : ""}`}
                    onClick={() => setSelectedNetwork(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              className="nova-wallet-refresh-btn"
              onClick={loadNetworks}
              disabled={loadingNetworks}
            >
              <i className={`pi ${loadingNetworks ? "pi-spin pi-spinner" : "pi-refresh"} me-1`} />
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
            className={`nova-wallet-tab-btn ${activeTab === "addresses" ? "is-active" : ""}`}
            onClick={() => setActiveTab("addresses")}
          >
            <i className="pi pi-map-marker me-2" />Deposit Addresses
          </button>
          <button
            type="button"
            className={`nova-wallet-tab-btn ${activeTab === "binance" ? "is-active" : ""}`}
            onClick={() => setActiveTab("binance")}
          >
            <i className="pi pi-credit-card me-2" />Binance Pay
          </button>
        </div>

        {activeTab === "addresses" ? (
          <WalletDepositAddressesPanel networks={networks} selectedNetwork={selectedNetwork} onNetworkChange={setSelectedNetwork} />
        ) : (
          <WalletBinancePayPanel networks={networks} />
        )}
      </div>
    </>
  );
};

export default Wallet;
