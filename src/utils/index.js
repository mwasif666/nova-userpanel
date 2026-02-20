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

export const makeError = (error) => {
  const errorBag = error?.response?.data?.errors || error?.response?.data?.error;
  const errorMessage = error?.response?.data?.message || error?.message;
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
