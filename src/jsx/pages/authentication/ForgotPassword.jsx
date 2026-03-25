import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import Swal from "sweetalert2";
import { request } from "../../../utils/api";
import { makeError } from "../../../utils";
import {
  forgotPasswordResetValidationSchema,
  forgotPasswordSendCodeValidationSchema,
} from "../../../utils/validate/validate";
import logo from "../../../assets/images/nova/logo-main.png";
import novaCards from "../../../assets/images/nova-cards.png";

const FORGOT_PASSWORD_STEPS = {
  EMAIL: "email",
  RESET: "reset",
};

function ForgotPassword() {
  const date = new Date();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(FORGOT_PASSWORD_STEPS.EMAIL);

  const sendCodeFormik = useFormik({
    initialValues: {
      email: "",
    },
    validationSchema: forgotPasswordSendCodeValidationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const email = values.email.trim();
        const response = await request({
          url: "app/forgot-password/send-code",
          method: "POST",
          data: { email },
        });

        resetFormik.setFieldValue("email", email, false);
        setCurrentStep(FORGOT_PASSWORD_STEPS.RESET);

        Swal.fire({
          icon: "success",
          title: "Code Sent",
          text: response?.message || "Password reset code sent successfully.",
          timer: 2500,
          showConfirmButton: false,
        });
      } catch (error) {
        makeError(error);
      } finally {
        setSubmitting(false);
      }
    },
  });

  const resetFormik = useFormik({
    initialValues: {
      email: "",
      verification_code: "",
      new_password: "",
      new_password_confirmation: "",
    },
    validationSchema: forgotPasswordResetValidationSchema,
    onSubmit: async (values, { resetForm, setSubmitting }) => {
      try {
        const payload = {
          email: values.email.trim(),
          verification_code: values.verification_code.trim(),
          new_password: values.new_password,
          new_password_confirmation: values.new_password_confirmation,
        };

        const response = await request({
          url: "app/forgot-password/reset",
          method: "POST",
          data: payload,
        });

        Swal.fire({
          icon: "success",
          title: "Password Reset",
          text:
            response?.message ||
            "Your password has been reset successfully. Please sign in.",
          timer: 2500,
          showConfirmButton: false,
        });

        resetForm();
        sendCodeFormik.resetForm();
        setCurrentStep(FORGOT_PASSWORD_STEPS.EMAIL);
        navigate("/login");
      } catch (error) {
        makeError(error);
      } finally {
        setSubmitting(false);
      }
    },
  });

  const renderFieldError = (formik, field) =>
    formik.touched[field] && formik.errors[field] ? (
      <div className="text-danger fs-12">{formik.errors[field]}</div>
    ) : null;

  const handleChangeEmail = () => {
    setCurrentStep(FORGOT_PASSWORD_STEPS.EMAIL);
    resetFormik.setFieldValue("verification_code", "", false);
    resetFormik.setFieldValue("new_password", "", false);
    resetFormik.setFieldValue("new_password_confirmation", "", false);
  };

  return (
    <div className="fix-wrapper nova-login">
      <div className="container-fluid">
        <div className="row h-100 align-items-center justify-contain-center">
          <div className="col-xl-12">
            <div className="card main-width nova-login-card">
              <div className="card-body p-0">
                <div className="row m-0">
                  <div className="col-xl-5 col-lg-6 nova-login-form">
                    <div className="card h-100">
                      <div className="card-body nova-form-body">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                          <img src={logo} alt="logo" width="150" />
                        </div>

                        <h2 className="mb-2">Forgot your password?</h2>
                        <p className="nova-subtitle">
                          {currentStep === FORGOT_PASSWORD_STEPS.EMAIL
                            ? "Enter your email address to receive a verification code."
                            : "Enter the verification code and your new password to complete the reset."}
                        </p>

                        {currentStep === FORGOT_PASSWORD_STEPS.EMAIL ? (
                          <form className="mt-4" onSubmit={sendCodeFormik.handleSubmit}>
                            <div className="form-group mb-4">
                              <label>Email address</label>
                              <input
                                type="email"
                                name="email"
                                className="form-control"
                                value={sendCodeFormik.values.email}
                                onChange={sendCodeFormik.handleChange}
                                onBlur={sendCodeFormik.handleBlur}
                                placeholder="Type your email address"
                              />
                              {renderFieldError(sendCodeFormik, "email")}
                            </div>

                            <button
                              type="submit"
                              disabled={sendCodeFormik.isSubmitting}
                              className="btn w-100 text-white mb-3 nova-login-btn"
                              style={{
                                backgroundColor: "#285e7f",
                                borderColor: "#285e7f",
                              }}
                            >
                              {sendCodeFormik.isSubmitting
                                ? "Sending Code..."
                                : "Send Reset Code"}
                            </button>
                          </form>
                        ) : (
                          <form className="mt-4" onSubmit={resetFormik.handleSubmit}>
                            <div className="form-group mb-3">
                              <label>Email address</label>
                              <input
                                type="email"
                                name="email"
                                className="form-control"
                                value={resetFormik.values.email}
                                onChange={resetFormik.handleChange}
                                onBlur={resetFormik.handleBlur}
                                placeholder="Type your email address"
                                readOnly
                              />
                              {renderFieldError(resetFormik, "email")}
                            </div>

                            <div className="form-group mb-3">
                              <label>Verification Code</label>
                              <input
                                type="text"
                                name="verification_code"
                                maxLength="6"
                                className="form-control"
                                value={resetFormik.values.verification_code}
                                onChange={resetFormik.handleChange}
                                onBlur={resetFormik.handleBlur}
                                placeholder="Enter 6 digit code"
                              />
                              {renderFieldError(resetFormik, "verification_code")}
                            </div>

                            <div className="form-group mb-3">
                              <label>New Password</label>
                              <input
                                type="password"
                                name="new_password"
                                className="form-control"
                                value={resetFormik.values.new_password}
                                onChange={resetFormik.handleChange}
                                onBlur={resetFormik.handleBlur}
                                placeholder="Enter your new password"
                              />
                              {renderFieldError(resetFormik, "new_password")}
                            </div>

                            <div className="form-group mb-4">
                              <label>Confirm New Password</label>
                              <input
                                type="password"
                                name="new_password_confirmation"
                                className="form-control"
                                value={resetFormik.values.new_password_confirmation}
                                onChange={resetFormik.handleChange}
                                onBlur={resetFormik.handleBlur}
                                placeholder="Retype your new password"
                              />
                              {renderFieldError(
                                resetFormik,
                                "new_password_confirmation",
                              )}
                            </div>

                            <button
                              type="submit"
                              disabled={resetFormik.isSubmitting}
                              className="btn w-100 text-white mb-3 nova-login-btn"
                              style={{
                                backgroundColor: "#285e7f",
                                borderColor: "#285e7f",
                              }}
                            >
                              {resetFormik.isSubmitting
                                ? "Resetting Password..."
                                : "Reset Password"}
                            </button>

                            <button
                              type="button"
                              className="btn btn-outline-primary w-100"
                              onClick={handleChangeEmail}
                            >
                              Change Email
                            </button>
                          </form>
                        )}

                        <div className="nova-form-footer mt-3">
                          <span>Remembered your password?</span>
                          <Link to="/login">Back to sign in</Link>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-xl-7 col-lg-6 position-relative nova-login-aside login-border">
                    <div className="d-flex flex-column justify-content-between h-100 nova-aside-inner">
                      <div className="nova-aside-hero">
                        <h2 className="text-white mb-2">Recover access fast.</h2>
                        <p className="text-white nova-aside-text">
                          We will send a verification code to your email so you
                          can securely reset your password and get back into your
                          account.
                        </p>
                      </div>

                      <div className="nova-aside-art" aria-hidden="true">
                        <img className="nova-aside-image" src={novaCards} alt="" />
                      </div>

                      <div className="d-flex align-items-center justify-content-between text-white pb-3 px-3">
                        <span className="text-center w-100">
                          Designed &amp; Developed{" "}
                          <a
                            className="text-white"
                            href="https://innovationpixel.com/"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Innovationpixel
                          </a>{" "}
                          {date.getFullYear()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
