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

export const walletWithdrawValidationSchema = Yup.object().shape({
  address: Yup.string().trim().required("Address is required"),
  amount: Yup.number()
    .typeError("Amount must be a valid number")
    .positive("Amount must be greater than 0")
    .required("Amount is required"),
  network: Yup.string().trim().required("Network is required"),
  currency: Yup.string().trim().required("Currency is required"),
});

export const walletTransferValidationSchema = Yup.object().shape({
  email: Yup.string()
    .required("Email is required")
    .email("Enter a valid email address"),
  amount: Yup.number()
    .typeError("Amount must be a valid number")
    .positive("Amount must be greater than 0")
    .required("Amount is required"),
});

