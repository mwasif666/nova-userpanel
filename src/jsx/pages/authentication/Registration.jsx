import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import Swal from "sweetalert2";
import { AuthContext } from "../../../context/authContext";
import { signupValidationSchema } from "../../../utils/validate/validate";
import { makeError } from "../../../utils";
import logo from "../../../assets/images/nova/logo-main.png";
import novaCards from "../../../assets/images/nova-cards.png";

function Register() {
  const date = new Date();
  const navigate = useNavigate();
  const [sendingCode, setSendingCode] = useState(false);
  const { signup, sendVerificationCode } = useContext(AuthContext);

  const formik = useFormik({
    initialValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      password_confirmation: "",
      verification_code: "",
      referral_code: "",
    },
    validationSchema: signupValidationSchema,
    onSubmit: async (values, { resetForm, setSubmitting }) => {
      try {
        const payload = {
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          password: values.password,
          password_confirmation: values.password_confirmation,
          verification_code: values.verification_code.trim(),
          referral_code: values.referral_code.trim(),
        };

        const signupResponse = await signup(payload);
        if (signupResponse.isError) {
          makeError(signupResponse.error);
          return;
        }

        const verificationResponse = await sendVerificationCode(payload.email);
        const signupMessage =
          signupResponse?.response?.message || "Signup completed successfully";

        if (verificationResponse.isError) {
          Swal.fire({
            icon: "warning",
            title: "Account Created",
            text: `${signupMessage}. Verification code abhi send nahi ho saka, please Get Code button se dobara try karein.`,
          });
        } else {
          Swal.fire({
            icon: "success",
            title: "Success",
            text:
              verificationResponse?.response?.message ||
              `${signupMessage}. Verification code sent successfully.`,
            timer: 2500,
            showConfirmButton: false,
          });
        }

        resetForm();
        navigate("/login");
      } catch (error) {
        makeError(error);
      } finally {
        setSubmitting(false);
      }
    },
  });

  const renderFieldError = (field) =>
    formik.touched[field] && formik.errors[field] ? (
      <div className="text-danger fs-12">{formik.errors[field]}</div>
    ) : null;

  const onGetCode = async () => {
    try {
      setSendingCode(true);
      await signupValidationSchema.validateAt("email", formik.values);

      const email = formik.values.email.trim();
      const response = await sendVerificationCode(email);
      if (response.isError) {
        makeError(response.error);
        return;
      }

      Swal.fire({
        icon: "success",
        title: "Code Sent",
        text: response?.response?.message || "Verification code sent",
        timer: 2500,
        showConfirmButton: false,
      });
    } catch (error) {
      if (error?.path === "email") {
        formik.setFieldTouched("email", true, true);
        formik.setFieldError("email", error.message);
      } else {
        makeError(error);
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
                  <div className="col-xl-5 col-lg-6 nova-login-form">
                    <div className="card h-100">
                      <div className="card-body nova-form-body">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                          <img src={logo} alt="logo" width="150" />
                        </div>
                        <h2 className="mb-2">Create your account</h2>
                        <p className="nova-subtitle">
                          Fill all details, get verification code, then complete
                          signup.
                        </p>

                        <form className="mt-4" onSubmit={formik.handleSubmit}>
                          <div className="row">
                            <div className="col-sm-6">
                              <div className="form-group mb-3">
                                <label>Name</label>
                                <input
                                  type="text"
                                  name="name"
                                  className="form-control"
                                  value={formik.values.name}
                                  onChange={formik.handleChange}
                                  onBlur={formik.handleBlur}
                                  placeholder="Type your full name"
                                />
                                {renderFieldError("name")}
                              </div>
                            </div>

                            <div className="col-sm-6">
                              <div className="form-group mb-3">
                                <label>Phone</label>
                                <input
                                  type="text"
                                  name="phone"
                                  className="form-control"
                                  value={formik.values.phone}
                                  onChange={formik.handleChange}
                                  onBlur={formik.handleBlur}
                                  placeholder="Type your phone number"
                                />
                                {renderFieldError("phone")}
                              </div>
                            </div>
                          </div>

                          <div className="form-group mb-3">
                            <label>Email</label>
                            <input
                              type="email"
                              name="email"
                              className="form-control"
                              value={formik.values.email}
                              onChange={formik.handleChange}
                              onBlur={formik.handleBlur}
                              placeholder="Type your email address"
                            />
                            {renderFieldError("email")}
                          </div>

                          <div className="row">
                            <div className="col-sm-6">
                              <div className="form-group mb-3">
                                <label>Password</label>
                                <input
                                  type="password"
                                  name="password"
                                  className="form-control"
                                  value={formik.values.password}
                                  onChange={formik.handleChange}
                                  onBlur={formik.handleBlur}
                                  placeholder="Type your password"
                                />
                                {renderFieldError("password")}
                              </div>
                            </div>

                            <div className="col-sm-6">
                              <div className="form-group mb-3">
                                <label>Confirm Password</label>
                                <input
                                  type="password"
                                  name="password_confirmation"
                                  className="form-control"
                                  value={formik.values.password_confirmation}
                                  onChange={formik.handleChange}
                                  onBlur={formik.handleBlur}
                                  placeholder="Retype your password"
                                />
                                {renderFieldError("password_confirmation")}
                              </div>
                            </div>
                          </div>

                          <div className="row">
                            <div className="col-sm-6">
                              <div className="form-group mb-3">
                                <label>Verification Code</label>
                                <div className="d-flex gap-2">
                                  <input
                                    type="text"
                                    name="verification_code"
                                    maxLength="6"
                                    className="form-control"
                                    value={formik.values.verification_code}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    placeholder="Enter 6 digit code"
                                  />
                                  <button
                                    type="button"
                                    disabled={sendingCode}
                                    onClick={onGetCode}
                                    className="btn btn-outline-primary px-3"
                                  >
                                    {sendingCode ? "Sending..." : "Get Code"}
                                  </button>
                                </div>
                                {renderFieldError("verification_code")}
                              </div>
                            </div>

                            <div className="col-sm-6">
                              <div className="form-group mb-3">
                                <label>Referral Code (Optional)</label>
                                <input
                                  type="text"
                                  name="referral_code"
                                  className="form-control"
                                  value={formik.values.referral_code}
                                  onChange={formik.handleChange}
                                  onBlur={formik.handleBlur}
                                  placeholder="Enter referral code"
                                />
                                {renderFieldError("referral_code")}
                              </div>
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={formik.isSubmitting}
                            className="btn w-100 text-white mb-3 nova-login-btn"
                            style={{ backgroundColor: "#285e7f", borderColor: "#285e7f" }}
                          >
                            {formik.isSubmitting ? "Creating Account..." : "Sign Up"}
                          </button>
                        </form>

                        <div className="nova-form-footer mt-3">
                          <span>Already have an account?</span>
                          <Link to="/login">Sign in</Link>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-xl-7 col-lg-6 position-relative nova-login-aside login-border">
                    <div className="d-flex flex-column justify-content-between h-100 nova-aside-inner">
                      <div className="nova-aside-hero">
                        <h2 className="text-white mb-2">
                          Join Nova user panel.
                        </h2>
                        <p className="text-white nova-aside-text">
                          Create your account to access wallet, cards,
                          transactions and your profile in one place.
                        </p>
                      </div>

                      <div className="nova-aside-art" aria-hidden="true">
                        <img
                          className="nova-aside-image"
                          src={novaCards}
                          alt=""
                        />
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

export default Register;
