import { useFormik } from "formik";
import { Modal } from "react-bootstrap";
import { getApiErrorMessage } from "../../../utils";
import { walletTransferValidationSchema } from "../../../utils/validate/validate";
import { request } from "../../../utils/api";

const TransferModal = ({ show, onHide }) => {
  const formik = useFormik({
    initialValues: {
      email: "",
      amount: "",
    },
    validationSchema: walletTransferValidationSchema,

    onSubmit: async (values, { resetForm, setSubmitting, setFieldError, setFieldTouched, setStatus }) => {
      setStatus({ error: "", success: "" });

      try {
        await request({
          url: "app/usdt/wallet/transfer",
          method: "POST",
          data: {
            email: values.email,
            amount: values.amount,
          },
        });

        setStatus({
          error: "",
          success: "Transfer request submitted successfully.",
        });

        resetForm();
      } catch (error) {
        const fieldErrors = error?.response?.data?.errors;

        if (fieldErrors) {
          Object.entries(fieldErrors).forEach(([key, value]) => {
            if (!["email", "amount"].includes(key)) return;

            const message = Array.isArray(value) ? value[0] : value;

            setFieldError(key, message);
            setFieldTouched(key, true, false);
          });
        }

        setStatus({
          error: getApiErrorMessage(error, "Transfer request cannot be submitted."),
          success: "",
        });
      } finally {
        setSubmitting(false);
      }
    },
  });

  const closeModal = () => {
    formik.resetForm();
    formik.setStatus({ error: "", success: "" });
    onHide();
  };

  const renderFieldError = (field) =>
    (formik.touched[field] || formik.submitCount > 0) && formik.errors[field] ? (
      <div className="text-danger fs-12 mb-2">{formik.errors[field]}</div>
    ) : null;

  const hasFieldError = (field) =>
    (formik.touched[field] || formik.submitCount > 0) && Boolean(formik.errors[field]);

  const statusError = formik.status?.error || "";
  const statusSuccess = formik.status?.success || "";

  return (
    <Modal centered show={show} onHide={closeModal}>
      <div className="modal-header">
        <h5 className="modal-title">Transfer</h5>
        <button className="btn-close" onClick={closeModal}></button>
      </div>

      <form onSubmit={formik.handleSubmit}>
        <div className="modal-body">

          <label className="form-label">Recipient Email</label>
          <input
            type="email"
            name="email"
            className={`form-control mb-2 ${hasFieldError("email") ? "is-invalid" : ""}`}
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="user@example.com"
          />
          {renderFieldError("email")}

          <label className="form-label">Amount</label>
          <input
            type="number"
            name="amount"
            className={`form-control mb-2 ${hasFieldError("amount") ? "is-invalid" : ""}`}
            value={formik.values.amount}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="100"
          />
          {renderFieldError("amount")}

          {statusError && (
            <div className="alert alert-danger mt-3">{statusError}</div>
          )}

          {statusSuccess && (
            <div className="alert alert-success mt-3">{statusSuccess}</div>
          )}

        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-danger light" onClick={closeModal}>
            Close
          </button>

          <button type="submit" className="btn btn-primary" disabled={formik.isSubmitting}>
            {formik.isSubmitting ? "Submitting..." : "Submit Transfer"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default TransferModal;