// src/utils/validation.js
import * as Yup from "yup";

export const loginValidationSchema = Yup.object().shape({
  email: Yup.string()
    .required("Email is required")
    .email("Enter a valid email address"),

  password: Yup.string()
    .required("Password is required")
    .min(6, "Password must be at least 6 characters"),
});

export const loginWithCodeValidationSchema = Yup.object().shape({
  email: Yup.string()
    .required("Email is required")
    .email("Enter a valid email address"),
  verification_code: Yup.string()
    .required("Verification code is required")
    .matches(/^[0-9]{6}$/, "Verification code must be exactly 6 digits"),
});

export const signupValidationSchema = Yup.object().shape({
  name: Yup.string().trim().required("Name is required"),
  email: Yup.string()
    .required("Email is required")
    .email("Enter a valid email address"),
  phone: Yup.string().trim().required("Phone is required"),
  password: Yup.string()
    .required("Password is required")
    .min(6, "Password must be at least 6 characters"),
  password_confirmation: Yup.string()
    .required("Please confirm your password")
    .oneOf([Yup.ref("password")], "Passwords must match"),
  verification_code: Yup.string()
    .required("Verification code is required")
    .matches(/^[0-9]{6}$/, "Verification code must be exactly 6 digits"),
  referral_code: Yup.string().trim(),
});

export const otpValidationSchema = Yup.object({
  otp: Yup.string()
    .required("OTP is required")
    .matches(/^[0-9]{6}$/, "OTP must be exactly 6 digits"),
});

