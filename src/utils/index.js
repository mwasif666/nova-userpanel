import { IMAGE_BASE_URL } from "./config";
import Swal from "sweetalert2";

export const getToken = (navigate, toast) => {
  const token = localStorage.getItem("token");
  if (!token) {
    navigate("/auth-signin");
    return;
  }
  return token;
};

export const getUser = () => {
  const user = localStorage.getItem("user");
  if (user) {
    return JSON.parse(user);
  }
};

export const getApiErrorMessage = (error, fallbackMessage = "") => {
  const payload = error?.response?.data || {};
  const errors = payload?.errors;
  const firstError =
    errors && typeof errors === "object"
      ? Object.values(errors).flat().find(Boolean)
      : "";

  const message =
    payload?.message ||
    payload?.error ||
    payload?.msg ||
    firstError ||
    error?.message ||
    fallbackMessage;

  return typeof message === "string" ? message.trim() : "";
};

export const makeError = (error) => {
  const errorBag = error?.response?.data?.errors || error?.response?.data?.error;
  const errorMessage = getApiErrorMessage(
    error,
    "Internal Server Error, Please try again",
  );
  if (errorBag && typeof errorBag === "object") {
    Object.keys(errorBag).forEach((key) => {
      const messages = Array.isArray(errorBag[key])
        ? errorBag[key]
        : [errorBag[key]];

      messages.forEach((msg) => {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: msg,
          timer: 3000,
          showConfirmButton: false,
        });
      });
    });
  } else {
    Swal.fire({
      icon: "error",
      title: "Oops!",
      text: errorMessage || "Internal Server Error, Please try again",
      timer: 3000,
      showConfirmButton: false,
    });
  }
};

/**
 * format date to 2026/01/01
 */
export const formatYYYYMMDD = (dateString) => {
  const date = new Date(dateString);
  return date.toISOString().split("T")[0];
};

/**
 * get today date
 */
export const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * showImage by path if path is not available then show static image
 */
export const showImage = (path) => {
  if (!path) {
    return "https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png";
  }
  return `${IMAGE_BASE_URL}${path}`;
};


/**
 * handle yup validation errors
*/
export const handleYupErrors = (err, initialErrors, setErrors) => {
  if (!err || !err.inner) return;

  const errorObj = { ...initialErrors };

  err.inner.forEach((error) => {
    if (error.path) {
      errorObj[error.path] = error.message;
    }
  });

  setErrors(errorObj);
};

export const toSafeNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export const formatCurrencyValue = (value, currency = "USD") => {
  const safeValue = toSafeNumber(value) ?? 0;
  const safeCurrency = String(currency || "USD").toUpperCase();

  try {
    return safeValue.toLocaleString("en-US", {
      style: "currency",
      currency: safeCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch (error) {
    return `${safeCurrency} ${safeValue.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
};

export const normalizeStatus = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "N/A";

  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const normalizeCardType = (value) => {
  if (value === 1 || value === "1") return "Physical";
  if (value === 2 || value === "2") return "Virtual";

  const text = String(value || "").toLowerCase();
  if (text.includes("virtual")) return "Virtual";
  if (text.includes("physical")) return "Physical";

  return normalizeStatus(value);
};

export const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export const formatDashboardDate = (value) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

export const getWeekdayIndex = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const day = parsed.getDay();
  return day === 0 ? 6 : day - 1;
};

export const getTransactionRawAmount = (txn) => {
  const amountCandidates = [
    txn?.amount,
    txn?.transaction_amount,
    txn?.value,
    txn?.total,
    txn?.net_amount,
    txn?.debit,
    txn?.credit,
  ];

  for (const candidate of amountCandidates) {
    const parsed = toSafeNumber(candidate);
    if (parsed !== null) return parsed;
  }
  return 0;
};

export const getTransactionTimestamp = (txn) =>
  txn?.created_at ||
  txn?.createdAt ||
  txn?.transaction_date ||
  txn?.date ||
  txn?.updated_at;

export const isWalletAssetUsable = (asset) => {
  if (!asset || typeof asset !== "object") return false;

  const balance = toSafeNumber(asset?.balance) ?? 0;
  const available = toSafeNumber(asset?.available_balance) ?? 0;
  const status = String(asset?.status || "").toLowerCase();

  return (
    balance > 0 ||
    available > 0 ||
    (!asset?.coming_soon && status !== "coming_soon")
  );
};
