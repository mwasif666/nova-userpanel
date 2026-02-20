import { useContext, useState } from "react";
import Swal from "sweetalert2";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/authContext";
import {
  loginValidationSchema,
  loginWithCodeValidationSchema,
} from "../../../utils/validate/validate";
import { handleYupErrors, makeError } from "../../../utils";
import logo from "../../..//assets/images/nova/logo-main.png";
import novaCards from "../../../assets/images/nova-cards.png";

function Login() {
  const date = new Date();
  const navigate = useNavigate();
  const { login, loginWithCode, sendVerificationCode } = useContext(AuthContext);

  const passwordErrorsObj = { email: "", password: "" };
  const codeErrorsObj = { email: "", verification_code: "" };

  const [activeTab, setActiveTab] = useState("password");

  const [passwordEmail, setPasswordEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState(passwordErrorsObj);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [codeEmail, setCodeEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeErrors, setCodeErrors] = useState(codeErrorsObj);
  const [codeLoading, setCodeLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  const onPasswordLogin = async (e) => {
    e.preventDefault();
    try {
      setPasswordLoading(true);
      setPasswordErrors(passwordErrorsObj);
      await loginValidationSchema.validate(
        { email: passwordEmail, password },
        { abortEarly: false },
      );

      const res = await login(passwordEmail.trim(), password);
      if (res.isError) {
        makeError(res.error);
        return;
      }

      navigate("/");
    } catch (err) {
      handleYupErrors(err, passwordErrorsObj, setPasswordErrors);
    } finally {
      setPasswordLoading(false);
    }
  };

  const onLoginWithCode = async (e) => {
    e.preventDefault();
    try {
      setCodeLoading(true);
      setCodeErrors(codeErrorsObj);
      await loginWithCodeValidationSchema.validate(
        {
          email: codeEmail,
          verification_code: verificationCode,
        },
        { abortEarly: false },
      );

      const res = await loginWithCode(codeEmail.trim(), verificationCode.trim());
      if (res.isError) {
        makeError(res.error);
        return;
      }

      navigate("/");
    } catch (err) {
      handleYupErrors(err, codeErrorsObj, setCodeErrors);
    } finally {
      setCodeLoading(false);
    }
  };

  const onSendCode = async () => {
    try {
      setSendingCode(true);
      setCodeErrors((prev) => ({ ...prev, email: "" }));
      await loginWithCodeValidationSchema.validateAt("email", {
        email: codeEmail,
      });

      const res = await sendVerificationCode(codeEmail.trim());
      if (res.isError) {
        makeError(res.error);
        return;
      }

      Swal.fire({
        icon: "success",
        title: "Code Sent",
        text: res?.response?.message || "Verification code sent successfully",
        timer: 2500,
        showConfirmButton: false,
      });
    } catch (err) {
      if (err?.path === "email") {
        setCodeErrors((prev) => ({ ...prev, email: err.message }));
      } else {
        makeError(err);
      }
    } finally {
      setSendingCode(false);
    }
  };

  return (
    <div className="fix-wrapper nova-login">
      <div className="container-fluid">
        <div className="row h-100 align-items-center justify-contain-center">
          <div className="col-xl-12">
            <div className="card main-width nova-login-card">
              <div className="card-body p-0">
                <div className="row m-0">
                  <div className="col-xl-5 col-lg-5 nova-login-form">
                    <div className="card h-100">
                      <div className="card-body nova-form-body">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                          <img src={logo} alt="logo" width="150" />
                        </div>
                        <h2 className="mb-2">Hi, Welcome Back!</h2>
                        <p className="nova-subtitle">
                          Login with password or verification code.
                        </p>

                        <ul className="nav nav-pills mb-4">
                          <li className="nav-item me-2">
                            <button
                              type="button"
                              className={`nav-link ${activeTab === "password" ? "active" : ""}`}
                              onClick={() => setActiveTab("password")}
                            >
                              With Password
                            </button>
                          </li>
                          <li className="nav-item">
                            <button
                              type="button"
                              className={`nav-link ${activeTab === "code" ? "active" : ""}`}
                              onClick={() => setActiveTab("code")}
                            >
                              With Verification Code
                            </button>
                          </li>
                        </ul>

                        {activeTab === "password" ? (
                          <form className="mt-2" onSubmit={onPasswordLogin}>
                            <div className="form-group mb-4">
                              <label>Email address</label>
                              <input
                                type="email"
                                className="form-control"
                                value={passwordEmail}
                                onChange={(e) => setPasswordEmail(e.target.value)}
                                placeholder="Type your email address"
                              />
                              {passwordErrors.email && (
                                <div className="text-danger fs-12">
                                  {passwordErrors.email}
                                </div>
                              )}
                            </div>

                            <div className="form-group mb-4">
                              <label>Password</label>
                              <input
                                type="password"
                                className="form-control"
                                value={password}
                                placeholder="Type your password"
                                onChange={(e) => setPassword(e.target.value)}
                              />
                              {passwordErrors.password && (
                                <div className="text-danger fs-12">
                                  {passwordErrors.password}
                                </div>
                              )}
                            </div>

                            <button
                              type="submit"
                              disabled={passwordLoading}
                              className="btn w-100 text-white mb-4 nova-login-btn"
                              style={{ backgroundColor: "#285e7f" }}
                            >
                              {passwordLoading ? "Signing In..." : "Sign In"}
                            </button>
                          </form>
                        ) : (
                          <form className="mt-2" onSubmit={onLoginWithCode}>
                            <div className="form-group mb-4">
                              <label>Email address</label>
                              <input
                                type="email"
                                className="form-control"
                                value={codeEmail}
                                onChange={(e) => setCodeEmail(e.target.value)}
                                placeholder="Type your email address"
                              />
                              {codeErrors.email && (
                                <div className="text-danger fs-12">
                                  {codeErrors.email}
                                </div>
                              )}
                            </div>

                            <div className="form-group mb-4">
                              <label>Verification Code</label>
                              <div className="d-flex gap-2">
                                <input
                                  type="text"
                                  maxLength="6"
                                  className="form-control"
                                  value={verificationCode}
                                  onChange={(e) => setVerificationCode(e.target.value)}
                                  placeholder="Enter 6 digit code"
                                />
                                <button
                                  type="button"
                                  className="btn btn-outline-primary px-3"
                                  onClick={onSendCode}
                                  disabled={sendingCode}
                                >
                                  {sendingCode ? "Sending..." : "Send Code"}
                                </button>
                              </div>
                              {codeErrors.verification_code && (
                                <div className="text-danger fs-12">
                                  {codeErrors.verification_code}
                                </div>
                              )}
                            </div>

                            <button
                              type="submit"
                              disabled={codeLoading}
                              className="btn w-100 text-white mb-4 nova-login-btn"
                              style={{ backgroundColor: "#285e7f" }}
                            >
                              {codeLoading ? "Signing In..." : "Login With Code"}
                            </button>
                          </form>
                        )}

                        <div className="nova-form-footer">
                          <span>New here?</span>
                          <Link to="/signup">Create an account</Link>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-xl-7 col-lg-7 position-relative nova-login-aside login-border">
                    <div className="d-flex flex-column justify-content-between h-100 nova-aside-inner">
                      <div className="nova-aside-hero">
                        <h2 className="text-white mb-2">Nova in your pocket.</h2>
                        <p className="text-white nova-aside-text">
                          Download the app and manage everything with secure,
                          fast access.
                        </p>
                        <div className="nova-downloads">
                          <a
                            className="nova-store-btn"
                            href="https://apps.apple.com/"
                            target="_blank"
                            rel="noreferrer"
                          >
                            <i className="fa-brands fa-apple" />
                            <span>
                              <small>Download on the</small>
                              <strong>App Store</strong>
                            </span>
                          </a>
                          <a
                            className="nova-store-btn"
                            href="https://play.google.com/store"
                            target="_blank"
                            rel="noreferrer"
                          >
                            <i className="fa-brands fa-google-play" />
                            <span>
                              <small>Get it on</small>
                              <strong>Google Play</strong>
                            </span>
                          </a>
                        </div>
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

export default Login;
