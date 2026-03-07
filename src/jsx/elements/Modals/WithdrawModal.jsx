import { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { useFormik } from "formik";
import { walletWithdrawValidationSchema } from "../../../utils/validate/validate";
import { request } from "../../../utils/api";
import { getApiErrorMessage } from "../../../utils";

const WithdrawModal = ({ show, onHide }) => {
  const [networks, setNetworks] = useState([]);
  const [loadingNetworks, setLoadingNetworks] = useState(false);
  const [apiError, setApiError] = useState("");
  const [apiSuccess, setApiSuccess] = useState("");

  const formik = useFormik({
    initialValues: {
      address: "",
      amount: "",
      network: "",
      currency: "USDT",
    },
    validationSchema: walletWithdrawValidationSchema,
    onSubmit: async (
      values,
      { resetForm, setSubmitting, setFieldError, setFieldTouched },
    ) => {
      setApiError("");
      setApiSuccess("");

      try {
        await request({
          url: "wallet/withdraw",
          method: "POST",
          data: values,
        });

        setApiSuccess("Withdraw request submitted successfully.");
        resetForm();
      } catch (error) {
        const fieldErrors = error?.response?.data?.errors;
        if (fieldErrors && typeof fieldErrors === "object") {
          Object.entries(fieldErrors).forEach(([key, value]) => {
            const mappedKey = key === "wallet_address" ? "address" : key;
            if (!["address", "amount", "network", "currency"].includes(mappedKey)) {
              return;
            }
            const firstMessage = Array.isArray(value) ? value[0] : value;
            if (typeof firstMessage === "string" && firstMessage.trim()) {
              setFieldError(mappedKey, firstMessage);
              setFieldTouched(mappedKey, true, false);
            }
          });
        }

        setApiError(
          getApiErrorMessage(error, "Withdraw request cannot be submitted."),
        );
      } finally {
        setSubmitting(false);
      }
    },
  });

  const loadNetworks = async () => {
    try {
      setLoadingNetworks(true);

      const res = await request({
        url: "app/usdt/wallet/withdrawal-networks",
        method: "GET",
      });
      const list = Array.isArray(res?.data?.networks) ? res.data.networks : [];
      
      setNetworks(list);

      if (list.length) {
        formik.setFieldValue("network", list[0]?.network || "");
      }
    } catch (error) {
      setApiError(
        getApiErrorMessage(error, "Failed to load withdrawal networks."),
      );
    } finally {
      setLoadingNetworks(false);
    }
  };

  useEffect(() => {
    if (show) {
      loadNetworks();
    }
  }, [show]);

  const closeModal = () => {
    formik.resetForm();
    setApiError("");
    setApiSuccess("");
    onHide();
  };

  const renderFieldError = (field) =>
    (formik.touched[field] || formik.submitCount > 0) && formik.errors[field] ? (
      <div className="text-danger fs-12 mb-2">{formik.errors[field]}</div>
    ) : null;

  const hasFieldError = (field) =>
    (formik.touched[field] || formik.submitCount > 0) && Boolean(formik.errors[field]);

  return (
    <Modal centered show={show} onHide={closeModal}>
      <div className="modal-header">
        <h5 className="modal-title">Withdraw</h5>
        <button className="btn-close" onClick={closeModal}></button>
      </div>

      <form onSubmit={formik.handleSubmit}>
        <div className="modal-body">

          {/* Address */}
          <label className="form-label">Address</label>
          <input
            type="text"
            name="address"
            className={`form-control mb-2 ${hasFieldError("address") ? "is-invalid" : ""}`}
            value={formik.values.address}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="Your Destination Address123456789"
          />
          {renderFieldError("address")}

          {/* Amount */}
          <label className="form-label">Amount</label>
          <input
            type="number"
            name="amount"
            className={`form-control mb-2 ${hasFieldError("amount") ? "is-invalid" : ""}`}
            value={formik.values.amount}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="100.50"
          />
          {renderFieldError("amount")}

          {/* Network */}
          <label className="form-label">Network</label>
          <select
            name="network"
            className={`form-select mb-2 ${hasFieldError("network") ? "is-invalid" : ""}`}
            value={formik.values.network}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            disabled={loadingNetworks}
          >
            {networks.map((net) => (
              <option key={net.network} value={net.network}>
                {net.name || net.network}
              </option>
            ))}
          </select>
          {renderFieldError("network")}

          {/* Currency */}
          <label className="form-label">Currency</label>
          <select
            name="currency"
            className={`form-select ${hasFieldError("currency") ? "is-invalid" : ""}`}
            value={formik.values.currency}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          >
            <option value="USDT">USDT</option>
          </select>
          {renderFieldError("currency")}

          {apiError && (
            <div className="alert alert-danger mt-3">{apiError}</div>
          )}

          {apiSuccess && (
            <div className="alert alert-success mt-3">{apiSuccess}</div>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-danger light"
            onClick={closeModal}
          >
            Close
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={formik.isSubmitting}
          >
            {formik.isSubmitting ? "Submitting..." : "Submit Withdraw"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default WithdrawModal;
