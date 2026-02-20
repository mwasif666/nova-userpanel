import React, { useEffect, useState } from "react";
import { Modal, Nav, Tab } from "react-bootstrap";
import PageTitle from "../../layouts/PageTitle";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { Button } from "primereact/button";
import { InputNumber } from "primereact/inputnumber";
import { request } from "../../../utils/api";
import {
  adminMetrics,
  cardInventory,
  cardSubscriptions,
} from "../../data/adminData";
import StatCard from "./components/StatCard";
import { SVGICON } from "../../constant/theme";
import { getStatusSeverity } from "./components/statusUtils";

const NETWORK_OPTIONS = [
  { key: "arbitrum", label: "Arbitrum" },
  { key: "tricom", label: "Tricom" },
  { key: "ethereum", label: "Ethereum" },
  { key: "polygon", label: "Polygon" },
];

const Cards = () => {
  const [virtualFee, setVirtualFee] = useState(10);
  const [physicalFee, setPhysicalFee] = useState(70);
  const [virtualDiscount, setVirtualDiscount] = useState(0);
  const [physicalDiscount, setPhysicalDiscount] = useState(0);
  const [atmFee, setAtmFee] = useState(0);
  const [networkFees, setNetworkFees] = useState({
    arbitrum: 0,
    tricom: 0,
    ethereum: 0,
    polygon: 0,
  });
  const [feeSaved, setFeeSaved] = useState(false);
  const [txFeeSaved, setTxFeeSaved] = useState(false);
  const [loader, setLoader] = useState(true);
  const [cardData, setCardData] = useState([]);
  const [cardProducts, setCardProducts] = useState([]);
  const [cardProductsLoading, setCardProductsLoading] = useState(true);
  const [detailRecord, setDetailRecord] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const formatFeeAmount = (value) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return "N/A";
    return `$${numeric.toLocaleString()}`;
  };

  const normalizeLabel = (value) => {
    if (!value) return "N/A";
    return String(value)
      .replace(/_/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const getDisplayValue = (value) => {
    if (value === null || value === undefined || value === "") return "N/A";
    return value;
  };

  const formatMoney = (value, currency = "") => {
    if (value === null || value === undefined || value === "") return "N/A";
    const numeric = Number(value);
    const formatted = Number.isNaN(numeric)
      ? String(value)
      : numeric.toLocaleString();
    return currency ? `${formatted} ${currency}` : formatted;
  };

  const getUserEmail = (row) =>
    row?.tevau_user?.user?.email ||
    row?.tevau_user?.user?.email_address ||
    "N/A";

  const getUserRole = (row) =>
    row?.tevau_user?.user?.role
      ? normalizeLabel(row.tevau_user.user.role)
      : "N/A";

  const normalizeCardType = (value) => {
    if (!value) return "";
    const text = String(value).toLowerCase();
    if (text.includes("virtual")) return "Virtual";
    if (text.includes("physical")) return "Physical";
    return normalizeLabel(value);
  };

  const resolveAvailability = (product) => {
    const status = normalizeLabel(product?.status);
    if (status === "Active" || status === "Available") return "Available";
    if (status === "Inactive" || status === "Paused" || status === "Disabled")
      return "Paused";
    if (product?.is_active === true) return "Available";
    if (product?.is_active === false) return "Paused";
    return "Available";
  };

  const parseWalletFees = (value) => {
    if (!value) return null;
    if (typeof value === "object") return value;
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  };

  const getWalletFeesFromProduct = (product) => {
    if (!product) return null;
    const parsed = parseWalletFees(product.wallet_to_wallet_fees);
    if (parsed) return parsed;

    const result = {};
    NETWORK_OPTIONS.forEach(({ key }) => {
      const rawValue =
        product[`wallet_to_wallet_fees_${key}`] ??
        product[`wallet_to_wallet_fee_${key}`] ??
        product[`wallet_fee_${key}`] ??
        product[`w2w_fee_${key}`];

      if (rawValue !== undefined && rawValue !== null && rawValue !== "") {
        const numeric = Number(rawValue);
        result[key] = Number.isNaN(numeric) ? rawValue : numeric;
      }
    });

    return Object.keys(result).length ? result : null;
  };

  const buildProductFormData = (product, overrides = {}) => {
    const formData = new FormData();
    const appendValue = (key, value) => {
      if (value === undefined || value === null || value === "") return;
      formData.append(key, value);
    };

    const cardType = product?.card_type || product?.type || "";
    const safeName =
      product?.name || `Nova ${normalizeCardType(cardType)}` || "Nova Card";

    appendValue("card_code", overrides.card_code ?? product?.card_code);
    appendValue("name", overrides.name ?? safeName);
    appendValue("description", overrides.description ?? product?.description);
    appendValue("card_type", overrides.card_type ?? cardType);
    appendValue("price", overrides.price ?? product?.price ?? 0);
    appendValue("discount", overrides.discount ?? product?.discount ?? 0);
    appendValue("currency", overrides.currency ?? product?.currency ?? "USD");
    appendValue("image_url", overrides.image_url ?? product?.image_url ?? product?.image);
    appendValue("atm_fee", overrides.atm_fee ?? product?.atm_fee ?? atmFee);

    const walletFees =
      overrides.wallet_to_wallet_fees ??
      product?.wallet_to_wallet_fees ??
      networkFees;
    if (walletFees && typeof walletFees === "object") {
      appendValue("wallet_to_wallet_fees", JSON.stringify(walletFees));
      Object.entries(walletFees).forEach(([key, value]) => {
        appendValue(`wallet_to_wallet_fees[${key}]`, value);
      });
    }

    return formData;
  };

  const updateCardProduct = async (product, overrides = {}) => {
    if (!product?.id) return;
    const payload = buildProductFormData(product, overrides);
    await request({
      url: `card-products/${product.id}`,
      method: "PUT",
      data: payload,
    });
  };

  const getCardData = async () => {
    setLoader(true);
    try {
      const res = await request({
        url: "tevau/cards",
        method: "GET",
      });
      const payload = res?.data?.data ?? res?.data ?? [];
      setCardData(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error(error);
      setCardData([]);
    } finally {
      setLoader(false);
    }
  };

  const getCardProducts = async () => {
    setCardProductsLoading(true);
    try {
      const res = await request({
        url: "card-products",
        method: "GET",
      });
      const payload = res?.data?.data ?? res?.data ?? [];
      const products = Array.isArray(payload) ? payload : [];
      setCardProducts(products);

      if (products.length) {
        const virtualProduct = products.find(
          (item) => normalizeCardType(item.card_type || item.type) === "Virtual",
        );
        const physicalProduct = products.find(
          (item) =>
            normalizeCardType(item.card_type || item.type) === "Physical",
        );

        if (virtualProduct) {
          const feeValue = Number(virtualProduct.price);
          const discountValue = Number(virtualProduct.discount);
          if (!Number.isNaN(feeValue)) setVirtualFee(feeValue);
          if (!Number.isNaN(discountValue)) setVirtualDiscount(discountValue);
        }

        if (physicalProduct) {
          const feeValue = Number(physicalProduct.price);
          const discountValue = Number(physicalProduct.discount);
          if (!Number.isNaN(feeValue)) setPhysicalFee(feeValue);
          if (!Number.isNaN(discountValue)) setPhysicalDiscount(discountValue);
        }

        const feeSource = virtualProduct || physicalProduct;
        if (feeSource) {
          const atmValue = Number(feeSource.atm_fee);
          if (!Number.isNaN(atmValue)) setAtmFee(atmValue);

          const walletValue = getWalletFeesFromProduct(feeSource);
          if (walletValue) {
            setNetworkFees((prev) => ({
              ...prev,
              ...walletValue,
            }));
          }
        }
      }
    } catch (error) {
      console.error(error);
      setCardProducts([]);
    } finally {
      setCardProductsLoading(false);
    }
  };

  useEffect(() => {
    getCardData();
    getCardProducts();
  }, []);

  const activeSubs = cardSubscriptions.filter(
    (sub) => sub.status === "Active",
  ).length;

  const cardDetails = {
    Virtual: {
      tagline: "Instant digital card for secure online spending.",
      delivery: "Instant",
      features: ["Instant issue", "Spend controls"],
    },
    Physical: {
      tagline: "Premium physical card for daily spend and ATM access.",
      delivery: "3-5 business days",
      features: ["NFC tap-to-pay", "ATM access"],
    },
  };

  const cardPreview = React.useMemo(() => {
    const fallbackMap = new Map(
      cardInventory.map((card) => [card.type, card]),
    );
    const productMap = new Map();
    cardProducts.forEach((product) => {
      const type = normalizeCardType(product.card_type || product.type);
      if (!type || productMap.has(type)) return;
      productMap.set(type, product);
    });

    return ["Virtual", "Physical"].map((type) => {
      const product = productMap.get(type);
      const fallback = fallbackMap.get(type);
      const feeOverride = type === "Virtual" ? virtualFee : physicalFee;
      const discountOverride = type === "Virtual" ? virtualDiscount : physicalDiscount;
      const feeValue =
        feeOverride ?? Number(product?.price ?? fallback?.fee ?? 0);
      const discountValue =
        discountOverride ?? Number(product?.discount ?? 0);

      return {
        id: product?.id ?? fallback?.id ?? type,
        name: product?.name || fallback?.name || `Nova ${type}`,
        type,
        fee: Number(feeValue || 0),
        discount: Number(discountValue || 0),
        status: resolveAvailability(product),
        image: product?.image_url || product?.image || fallback?.image,
        currency: product?.currency || "USD",
      };
    });
  }, [
    cardProducts,
    cardInventory,
    virtualFee,
    physicalFee,
    virtualDiscount,
    physicalDiscount,
  ]);

  const cardPreviewCount = cardProductsLoading ? "..." : cardPreview.length;

  const formatCardMoney = (value) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return "N/A";
    return `$${numeric.toLocaleString()}`;
  };

  const actionTemplate = (rowData) => (
    <Button
      icon="pi pi-eye"
      className="p-button-text p-button-rounded p-button-plain"
      onClick={() => {
        setDetailRecord(rowData);
        setDetailOpen(true);
      }}
    />
  );

  const statusTemplate = (rowData) => {
    const label = normalizeLabel(rowData.status);
    return <Tag value={label} severity={getStatusSeverity(label)} />;
  };

  const typeTemplate = (rowData) => normalizeLabel(rowData.card_type);

  const balanceTemplate = (rowData) =>
    formatMoney(rowData.balance, rowData.currency);

  const boundTemplate = (rowData) => (rowData.is_bound ? "Yes" : "No");

  const formatDateTime = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const handleSave = async () => {
    try {
      const virtualProduct = cardProducts.find(
        (item) => normalizeCardType(item.card_type || item.type) === "Virtual",
      );
      const physicalProduct = cardProducts.find(
        (item) =>
          normalizeCardType(item.card_type || item.type) === "Physical",
      );

      if (virtualProduct) {
        await updateCardProduct(virtualProduct, {
          price: virtualFee,
          discount: virtualDiscount,
        });
      }
      if (physicalProduct) {
        await updateCardProduct(physicalProduct, {
          price: physicalFee,
          discount: physicalDiscount,
        });
      }

      await getCardProducts();
      setFeeSaved(true);
      setTimeout(() => setFeeSaved(false), 1500);
    } catch (error) {
      console.error(error);
    }
  };

  const handleTxSave = async () => {
    try {
      const virtualProduct = cardProducts.find(
        (item) => normalizeCardType(item.card_type || item.type) === "Virtual",
      );
      const physicalProduct = cardProducts.find(
        (item) =>
          normalizeCardType(item.card_type || item.type) === "Physical",
      );

      const payload = {
        atm_fee: atmFee,
        wallet_to_wallet_fees: networkFees,
      };

      if (virtualProduct) {
        await updateCardProduct(virtualProduct, payload);
      }
      if (physicalProduct) {
        await updateCardProduct(physicalProduct, payload);
      }

      await getCardProducts();
      setTxFeeSaved(true);
      setTimeout(() => setTxFeeSaved(false), 1500);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <PageTitle motherMenu="Cards" activeMenu="Card Management" />
      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <StatCard
            title="Cards Purchased"
            value={adminMetrics.purchasedCards}
            icon={SVGICON.BillsSvg}
            color="primary"
          />
        </div>
        <div className="col-md-3">
          <StatCard
            title="Total Subscribers"
            value={adminMetrics.totalSubscribers}
            icon={SVGICON.PatientUser}
            color="success"
          />
        </div>
        <div className="col-md-3">
          <StatCard
            title="Virtual Subscribers"
            value={adminMetrics.virtualSubscribers}
            icon={SVGICON.ArrowGreen}
            color="info"
          />
        </div>
        <div className="col-md-3">
          <StatCard
            title="Physical Subscribers"
            value={adminMetrics.physicalSubscribers}
            icon={SVGICON.ArrowRed}
            color="warning"
          />
        </div>
      </div>
      <div className="row g-3">
        <div className="col-12">
          <div className="card nova-panel">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h4 className="mb-1">Card Inventory</h4>
                  <p className="mb-0 text-muted">
                    Active subscribers: {activeSubs} | {cardPreviewCount} card
                    types live
                  </p>
                </div>
                {/* <Button
                  label="Add New Card"
                  icon="pi pi-plus"
                  className="p-button-sm"
                /> */}
              </div>
              <div className="nova-card-grid">
                {cardPreview.map((card) => {
                  const details = cardDetails[card.type] || {};
                  const features = details.features || [];
                  const statusClass =
                    card.status === "Available" ? "is-available" : "is-paused";

                  return (
                    <div
                      key={card.id}
                      className={`nova-card-tile is-${card.type.toLowerCase()}`}
                    >
                      <div className="nova-card-tile-content">
                        <div className="nova-card-badges">
                          <span className="nova-card-chip">
                            {card.type} Card
                          </span>
                          <span className={`nova-card-status ${statusClass}`}>
                            {card.status}
                          </span>
                        </div>
                        <h5 className="nova-card-name">{card.name}</h5>
                        <p className="nova-card-desc">{details.tagline}</p>
                        <div className="nova-card-meta">
                          <div>
                            <span className="nova-card-meta-label">Fee</span>
                            <span className="nova-card-meta-value">
                              {formatCardMoney(card.fee)}
                            </span>
                          </div>
                          <div>
                            <span className="nova-card-meta-label">
                              Discount
                            </span>
                            <span className="nova-card-meta-value">
                              {formatCardMoney(card.discount)}
                            </span>
                          </div>
                          <div>
                            <span className="nova-card-meta-label">
                              Delivery
                            </span>
                            <span className="nova-card-meta-value">
                              {details.delivery}
                            </span>
                          </div>
                        </div>
                        {features.length > 0 && (
                          <div className="nova-card-features">
                            {features.map((feature) => (
                              <span
                                key={`${card.id}-${feature}`}
                                className="nova-card-feature"
                              >
                                <i className="pi pi-check-circle" />
                                {feature}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="nova-card-visual">
                        <img
                          src={card.image}
                          alt={`${card.name} preview`}
                          className="nova-card-hero"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mt-3">
        <div className="col-xl-6">
          <div className="card nova-panel">
            <div className="card-body">
              <h4 className="mb-3">Set Card Fee</h4>
              <Tab.Container defaultActiveKey="virtual">
                <Nav as="ul" className="nav nav-tabs mb-3">
                  <Nav.Item as="li">
                    <Nav.Link eventKey="virtual">Virtual Card</Nav.Link>
                  </Nav.Item>
                  <Nav.Item as="li">
                    <Nav.Link eventKey="physical">Physical Card</Nav.Link>
                  </Nav.Item>
                </Nav>
                <Tab.Content>
                  <Tab.Pane eventKey="virtual">
                    <label className="form-label">Virtual Card Fee (USD)</label>
                    <InputNumber
                      value={virtualFee}
                      onValueChange={(e) => setVirtualFee(e.value || 0)}
                      className="w-100 mb-3"
                      inputClassName="form-control"
                    />
                    <label className="form-label">
                      Virtual Card Discount (USD)
                    </label>
                    <InputNumber
                      value={virtualDiscount}
                      onValueChange={(e) => setVirtualDiscount(e.value || 0)}
                      className="w-100 mb-3"
                      inputClassName="form-control"
                    />
                  </Tab.Pane>
                  <Tab.Pane eventKey="physical">
                    <label className="form-label">
                      Physical Card Fee (USD)
                    </label>
                    <InputNumber
                      value={physicalFee}
                      onValueChange={(e) => setPhysicalFee(e.value || 0)}
                      className="w-100 mb-3"
                      inputClassName="form-control"
                    />
                    <label className="form-label">
                      Physical Card Discount (USD)
                    </label>
                    <InputNumber
                      value={physicalDiscount}
                      onValueChange={(e) => setPhysicalDiscount(e.value || 0)}
                      className="w-100 mb-3"
                      inputClassName="form-control"
                    />
                  </Tab.Pane>
                </Tab.Content>
              </Tab.Container>
              <Button
                label="Save Fees"
                icon="pi pi-check"
                className="p-button-sm w-100"
                onClick={handleSave}
              />
              {feeSaved && (
                <p className="text-success mt-2 mb-0">Fees saved.</p>
              )}
            </div>
          </div>
        </div>
        <div className="col-xl-6">
          <div className="card nova-panel">
            <div className="card-body">
              <h4 className="mb-3">Transaction Fees</h4>
              <label className="form-label">ATM Fee (USD)</label>
              <InputNumber
                value={atmFee}
                onValueChange={(e) => setAtmFee(e.value || 0)}
                className="w-100 mb-3"
                inputClassName="form-control"
              />

              <div className="mb-2">
                <label className="form-label">
                  Wallet-to-Wallet Fees (USD)
                </label>
                <div className="row g-2">
                  {NETWORK_OPTIONS.map((network) => (
                    <div className="col-6" key={network.key}>
                      <div className="text-muted small mb-1">
                        {network.label}
                      </div>
                      <InputNumber
                        value={networkFees[network.key] || 0}
                        onValueChange={(e) =>
                          setNetworkFees((prev) => ({
                            ...prev,
                            [network.key]: e.value || 0,
                          }))
                        }
                        className="w-100"
                        inputClassName="form-control"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Button
                label="Save Transaction Fees"
                icon="pi pi-check"
                className="p-button-sm w-100"
                onClick={handleTxSave}
              />
              {txFeeSaved && (
                <p className="text-success mt-2 mb-0">Fees saved.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mt-3">
        <div className="col-12">
          <div className="card nova-panel">
            <div className="card-body">
              <h4 className="mb-3">User Cards</h4>

              <DataTable
                value={cardData}
                loading={loader}
                className="p-datatable-sm nova-table"
              >
                <Column field="id" header="ID" sortable />
                <Column field="card_id" header="Card ID" sortable />
                <Column field="user_code" header="User Code" sortable />
                <Column
                  header="User Email"
                  body={(rowData) => getUserEmail(rowData)}
                />
                <Column field="card_type" header="Type" body={typeTemplate} sortable />
                <Column field="status" header="Status" body={statusTemplate} sortable />
                <Column field="balance" header="Balance" body={balanceTemplate} sortable />
                <Column field="is_bound" header="Bound" body={boundTemplate} sortable />
                <Column header="Action" body={actionTemplate} />
              </DataTable>
            </div>
          </div>
        </div>
      </div>
      <Modal
        show={detailOpen}
        onHide={() => setDetailOpen(false)}
        centered
        size="lg"
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Card Details</h5>
            <button
              type="button"
              className="btn-close"
              onClick={() => setDetailOpen(false)}
            />
          </div>
          <div className="modal-body">
            {detailRecord && (
              <>
                <div className="row g-3">
                  <div className="col-12">
                    <h6 className="mb-0">Card Summary</h6>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Record ID</div>
                    <div className="fw-semibold">
                      {getDisplayValue(detailRecord.id)}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Card ID</div>
                    <div className="fw-semibold">
                      {getDisplayValue(detailRecord.card_id)}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Card Number</div>
                    <div className="fw-semibold">
                      {getDisplayValue(detailRecord.card_number)}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Card Type</div>
                    <div className="fw-semibold">
                      {normalizeLabel(detailRecord.card_type)}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Status</div>
                    <div className="fw-semibold">
                      <Tag
                        value={normalizeLabel(detailRecord.status)}
                        severity={getStatusSeverity(
                          normalizeLabel(detailRecord.status),
                        )}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Balance</div>
                    <div className="fw-semibold">
                      {formatMoney(detailRecord.balance, detailRecord.currency)}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Currency</div>
                    <div className="fw-semibold">
                      {getDisplayValue(detailRecord.currency)}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Bound</div>
                    <div className="fw-semibold">
                      {detailRecord.is_bound ? "Yes" : "No"}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Bound At</div>
                    <div className="fw-semibold">
                      {formatDateTime(detailRecord.bound_at)}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Frozen At</div>
                    <div className="fw-semibold">
                      {formatDateTime(detailRecord.frozen_at)}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">User Code</div>
                    <div className="fw-semibold">
                      {getDisplayValue(detailRecord.user_code)}
                    </div>
                  </div>
                </div>

                <hr />

                <div className="row g-3">
                  <div className="col-12">
                    <h6 className="mb-0">User Details</h6>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Email</div>
                    <div className="fw-semibold">{getUserEmail(detailRecord)}</div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Role</div>
                    <div className="fw-semibold">{getUserRole(detailRecord)}</div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Tevau Status</div>
                    <div className="fw-semibold">
                      {normalizeLabel(detailRecord?.tevau_user?.status)}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">User Active</div>
                    <div className="fw-semibold">
                      {detailRecord?.tevau_user?.user?.is_active === undefined
                        ? "N/A"
                        : detailRecord.tevau_user.user.is_active
                          ? "Yes"
                          : "No"}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="text-muted small">Tevau User ID</div>
                    <div className="fw-semibold">
                      {getDisplayValue(detailRecord?.tevau_user?.id)}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="text-muted small">Third ID</div>
                    <div className="fw-semibold">
                      {getDisplayValue(detailRecord?.tevau_user?.third_id)}
                    </div>
                  </div>
                </div>

                <hr />

                <div className="row g-3">
                  <div className="col-12">
                    <h6 className="mb-0">Fee Settings</h6>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">ATM Fee</div>
                    <div className="fw-semibold">{formatFeeAmount(atmFee)}</div>
                  </div>
                  {NETWORK_OPTIONS.map((network) => (
                    <div className="col-md-6" key={network.key}>
                      <div className="text-muted small">
                        {network.label} Wallet Fee
                      </div>
                      <div className="fw-semibold">
                        {formatFeeAmount(networkFees[network.key])}
                      </div>
                    </div>
                  ))}
                </div>

                <hr />

                <div className="row g-3">
                  <div className="col-12">
                    <h6 className="mb-0">Audit</h6>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Created At</div>
                    <div className="fw-semibold">
                      {formatDateTime(detailRecord.created_at)}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Updated At</div>
                    <div className="fw-semibold">
                      {formatDateTime(detailRecord.updated_at)}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Deleted At</div>
                    <div className="fw-semibold">
                      {formatDateTime(detailRecord.deleted_at)}
                    </div>
                  </div>
                </div>

              </>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Cards;
