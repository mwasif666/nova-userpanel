import { request } from "../utils/api";

const ROOT_API_BASE_URL = "https://nova.innovationpixel.com/public/api/";

const getErrorMessage = (error) => {
  const payload = error?.response?.data || {};
  const errors = payload?.errors;
  const firstError =
    errors && typeof errors === "object"
      ? Object.values(errors).flat().find(Boolean)
      : "";

  return String(
    payload?.message ||
      payload?.msg ||
      payload?.error ||
      firstError ||
      error?.message ||
      "",
  )
    .trim()
    .toLowerCase();
};

const hasEndpointNotFoundError = (error) => {
  const message = getErrorMessage(error);
  if (!message) return false;

  return [
    "endpoint not found",
    "route",
    "not found",
    "does not exist",
  ].some((token) => message.includes(token));
};

const callWalletEndpoint = async ({
  candidates = [],
  method = "GET",
  data = null,
  fallbackStatuses = [404, 405],
}) => {
  let lastError = null;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    try {
      const response = await request({
        url: candidate.url,
        method,
        data,
        ...(candidate.baseURL ? { baseURL: candidate.baseURL } : {}),
      });
      return response;
    } catch (error) {
      lastError = error;
      const status = Number(error?.response?.status || 0);
      const shouldRetry =
        index < candidates.length - 1 &&
        (fallbackStatuses.includes(status) || hasEndpointNotFoundError(error));
      if (!shouldRetry) throw error;
    }
  }

  throw lastError || new Error("Wallet request failed.");
};

const buildFormData = (payload) => {
  const form = new FormData();
  Object.entries(payload || {}).forEach(([key, value]) => {
    form.append(key, value ?? "");
  });
  return form;
};

export const getWalletNetworks = async () =>
  callWalletEndpoint({
    method: "GET",
    candidates: [
      { url: "wallet/networks" },
      { url: "app/wallet/networks", baseURL: ROOT_API_BASE_URL },
      { url: "wallet/networks", baseURL: ROOT_API_BASE_URL },
    ],
  });

export const getWalletDepositAddresses = async ({ asset, network = "" }) =>
  callWalletEndpoint({
    method: "GET",
    data: {
      asset: String(asset || "").trim(),
      ...(String(network || "").trim()
        ? { network: String(network || "").trim() }
        : {}),
    },
    candidates: [
      { url: "wallet/deposit-addresses" },
      { url: "app/wallet/deposit-addresses", baseURL: ROOT_API_BASE_URL },
      { url: "wallet/deposit-addresses", baseURL: ROOT_API_BASE_URL },
    ],
  });

export const createUsdtWalletDepositBinancePay = async ({
  amount,
  currency = "USDT",
  network = "",
}) =>
  callWalletEndpoint({
    method: "POST",
    data: buildFormData({
      amount: String(amount ?? "").trim(),
      currency: String(currency || "USDT").trim(),
      ...(String(network || "").trim()
        ? { network: String(network || "").trim() }
        : {}),
    }),
    candidates: [
      { url: "usdt/wallet/deposit/binance-pay" },
      { url: "app/usdt/wallet/deposit/binance-pay", baseURL: ROOT_API_BASE_URL },
      { url: "usdt/wallet/deposit/binance-pay", baseURL: ROOT_API_BASE_URL },
    ],
  });

export const getUsdtWalletBinancePayStatus = async ({ merchantTradeNo }) =>
  callWalletEndpoint({
    method: "GET",
    data: {
      merchant_trade_no: String(merchantTradeNo || "").trim(),
    },
    candidates: [
      { url: "usdt/wallet/binance-pay/status" },
      { url: "app/usdt/wallet/binance-pay/status", baseURL: ROOT_API_BASE_URL },
      { url: "usdt/wallet/binance-pay/status", baseURL: ROOT_API_BASE_URL },
    ],
  });

