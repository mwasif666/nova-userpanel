import { useEffect, useMemo, useState } from "react";
import { Modal } from "react-bootstrap";
import { useFormik } from "formik";
import * as Yup from "yup";
import Swal from "sweetalert2";
import { request } from "../../../utils/api";
import { formatMoney, getApiErrorMessage, maskCardLast4, normalizeCardType, toSafeNumber } from "../../../utils";

const MIN_TOPUP_AMOUNT = 10;

const resolveTopupCardId = (card) => {
  const parsedId = Number(card?.id);
  if (Number.isInteger(parsedId) && parsedId > 0) {
    return String(parsedId);
  }

  return "";
};

const calculateFeeAmount = (amount, fee) => {
  const safeAmount = toSafeNumber(amount);
  const feeValue = toSafeNumber(fee?.value);
  const feeType = String(fee?.value_type || "").trim().toLowerCase();

  if (safeAmount === null || safeAmount <= 0 || feeValue === null || feeValue < 0) {
    return null;
  }

  if (["percent", "percentage", "precent", "rate"].includes(feeType)) {
    return (safeAmount * feeValue) / 100;
  }

  return feeValue;
};

const buildValidationSchema = (walletBalance) =>
  Yup.object().shape({
    amount: Yup.number()
      .typeError("Amount must be a valid number")
      .required("Amount is required")
      .min(MIN_TOPUP_AMOUNT, `Minimum top up amount is ${MIN_TOPUP_AMOUNT} USD`)
      .test(
        "wallet-balance",
        "Amount exceeds available wallet balance",
        (value) => {
          if (!Number.isFinite(walletBalance) || walletBalance <= 0) return true;
          if (!Number.isFinite(value)) return true;
          return value <= walletBalance;
        },
      ),
  });

const CardTopUpModal = ({
  show,
  onHide,
  card = null,
  walletAsset = null,
  onSuccess = null,
}) => {
  const [fee, setFee] = useState({});
  const [feeLoading, setFeeLoading] = useState(false);
  const walletCurrency = String(walletAsset?.currency || "USD").toUpperCase();
  const walletBalance =
    toSafeNumber(walletAsset?.available_balance ?? walletAsset?.balance) ?? 0;
  const topupCardId = resolveTopupCardId(card);

  const validationSchema = useMemo(
    () => buildValidationSchema(walletBalance),
    [walletBalance],
  );

  const formik = useFormik({
    initialValues: {
      amount: "",
    },
    enableReinitialize: true,
    validationSchema,
    onSubmit: async (values, { resetForm, setSubmitting }) => {
      try {
        await request({
          url: `app/tevau/cards/${encodeURIComponent(topupCardId)}/topup`,
          method: "POST",
          data: {
            amount: Number(values.amount),
          },
        });

        Swal.fire({
          icon: "success",
          title: "Top Up Successful",
          text: "Card top up completed successfully.",
          timer: 2500,
          showConfirmButton: false,
        });

        resetForm();
        onHide();

        if (typeof onSuccess === "function") {
          await onSuccess();
        }
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Top Up Failed",
          text: getApiErrorMessage(error, "Failed to top up card."),
        });
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    if (!show) {
      formik.resetForm();
      return;
    }

    let active = true;

    const getTransferFee = async () => {
      try {
        setFeeLoading(true);
        const res = await request({
          method: "GET",
          url: "app/platform-fees",
        });

        if (!active) return;
        setFee(res?.data?.transfer || {});
      } catch (error) {
        if (active) {
          setFee({});
        }
      } finally {
        if (active) {
          setFeeLoading(false);
        }
      }
    };

    getTransferFee();

    return () => {
      active = false;
    };
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  const amountValue = toSafeNumber(formik.values.amount);
  const feeAmount = calculateFeeAmount(amountValue, fee);
  const receivedAmount =
    amountValue !== null && feeAmount !== null
      ? Math.max(amountValue - feeAmount, 0)
      : null;
  const cardBalanceValue =
    toSafeNumber(card?.balance ?? card?.tevau_response?.cardBalance) ?? 0;
  const cardCurrency = String(
    card?.currency || card?.tevau_response?.cardCurrency || "USD",
  ).toUpperCase();
  const canSubmit =
    Boolean(topupCardId) && walletBalance > 0 && !formik.isSubmitting;

  const renderFieldError = (field) =>
    formik.touched[field] && formik.errors[field] ? (
      <div className="text-danger fs-12 mt-1">{formik.errors[field]}</div>
    ) : null;

  const hasFieldError = (field) =>
    Boolean(formik.touched[field] && formik.errors[field]);

  return (
    <Modal centered show={show} onHide={onHide}>
      <div className="modal-header">
        <h5 className="modal-title">Topup</h5>
        <button
          type="button"
          className="btn-close"
          onClick={onHide}
          aria-label="Close"
        />
      </div>

      <form onSubmit={formik.handleSubmit}>
        <div className="modal-body">
          <label className="form-label">Selected Card</label>
          <input
            type="text"
            className="form-control mb-2"
            value={`${
              card?.displayName || card?.card_name || "Selected Card"
            } - ${maskCardLast4(card)} (${normalizeCardType(
              card?.displayType || card?.card_type || card?.type,
            )})`}
            readOnly
          />

          <label className="form-label">Amount</label>
          <div className="input-group nova-topup-amount-group mb-1">
            <span className="input-group-text">{walletCurrency}</span>
            <input
              type="number"
              min={MIN_TOPUP_AMOUNT}
              step="0.01"
              name="amount"
              className={`form-control ${hasFieldError("amount") ? "is-invalid" : ""}`}
              value={formik.values.amount}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder="Enter amount"
            />
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() =>
                formik.setFieldValue(
                  "amount",
                  walletBalance > 0 ? String(walletBalance) : "",
                  true,
                )
              }
            >
              Max
            </button>
          </div>
          <div className="text-muted fs-12 mb-2">
            Minimum topup amount is {MIN_TOPUP_AMOUNT} USD.
          </div>
          {renderFieldError("amount")}

          <div className="card border-primary shadow-sm mb-3">
            <div className="card-body p-3">
              <h6 className="card-subtitle text-primary mb-3">
                Card Information
              </h6>
              <div className="row g-2">
                <div className="col-6">
                  <div className="text-center">
                    <div className="fw-bold text-muted small">Card Balance</div>
                    <div className="h5 text-primary mb-0">
                      {formatMoney(cardBalanceValue, cardCurrency)}
                    </div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="text-center">
                    <div className="fw-bold text-muted small">Wallet Balance</div>
                    <div className="h5 text-primary mb-0">
                      {formatMoney(walletBalance, walletCurrency)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card border-primary shadow-sm">
            <div className="card-body p-3">
              <h6 className="card-subtitle text-primary mb-3">
                Topup Information
              </h6>
              <div className="row g-3">
                <div className="col-6">
                  <div className="text-center">
                    <div className="fw-bold text-muted small">Fees</div>
                    <div className="h5 text-primary mb-0">
                      {feeLoading
                        ? "Loading..."
                        : feeAmount !== null
                          ? formatMoney(feeAmount, walletCurrency)
                          : "--"}
                    </div>
                  </div>
                </div>
                {/* <div className="col-6">
                  <div className="text-center">
                    <div className="fw-bold text-muted small">Fee Type</div>
                    <div className="h5 text-primary mb-0">
                      {feeLoading
                        ? "Loading..."
                        : fee?.value_type}
                    </div>
                  </div>
                </div> */}
                <div className="col-6">
                  <div className="text-center">
                    <div className="fw-bold text-muted small">
                      Received Amount
                    </div>
                    <div className="h5 text-primary mb-0">
                      {receivedAmount !== null
                        ? formatMoney(receivedAmount, walletCurrency)
                        : "--"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-danger light"
            onClick={onHide}
          >
            Close
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!canSubmit}
          >
            {formik.isSubmitting ? "Processing..." : "Confirm"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CardTopUpModal;
