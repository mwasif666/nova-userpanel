import { createContext, useState, useEffect, useCallback } from "react";
import { request } from "../utils/api";

export const AuthContext = createContext();

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const resolveUserPayload = (payload) => {
  if (!isObject(payload)) return null;

  const candidates = [
    payload?.data?.user,
    payload?.user,
    payload?.data?.profile,
    payload?.profile,
    payload?.data?.data?.user,
    payload?.data?.data,
    payload?.data,
  ];

  for (const candidate of candidates) {
    if (!isObject(candidate)) continue;

    const looksLikeAuthEnvelope =
      candidate?.token !== undefined ||
      candidate?.access_token !== undefined ||
      candidate?.expires_in !== undefined ||
      candidate?.user !== undefined;

    if (looksLikeAuthEnvelope && !candidate?.id && !candidate?.email && !candidate?.name) {
      continue;
    }

    return candidate;
  }

  return null;
};

const resolveAuthPayload = (payload) => {
  const container = isObject(payload?.data) ? payload.data : payload;

  const token =
    container?.token ||
    container?.access_token ||
    payload?.token ||
    payload?.access_token ||
    null;

  const expires_in = container?.expires_in ?? payload?.expires_in ?? null;
  const user = resolveUserPayload(payload);

  return { token, expires_in, user };
};

const resolvePermissionKeys = (permissions) => {
  if (Array.isArray(permissions)) {
    return permissions
      .map((permission) =>
        typeof permission === "string" ? permission : permission?.key,
      )
      .filter(Boolean);
  }

  if (isObject(permissions)) {
    return Object.keys(permissions).filter((key) => Boolean(permissions[key]));
  }

  return [];
};

const resolveRoleValue = (user) => {
  if (!isObject(user)) return null;

  if (user?.role_key !== undefined && user?.role_key !== null) return user.role_key;
  if (typeof user?.role === "string") return user.role;
  if (isObject(user?.role)) return user.role.key || user.role.name || user.role.title || null;

  return user?.role ?? null;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getStoredUser = useCallback(() => {
    const userData = localStorage.getItem("user");
    if (!userData) return null;

    try {
      const parsed = JSON.parse(userData);
      return isObject(parsed) ? parsed : null;
    } catch (error) {
      return null;
    }
  }, []);

  const removeDataInLocalStorage = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("permissions");
    localStorage.removeItem("expire");
    localStorage.removeItem("nova_role");
    localStorage.removeItem("email");
    setUser(null);
  }, []);

  const applyUserData = useCallback((userData, tokenOverride = null) => {
    if (!isObject(userData)) return;

    const permissions = resolvePermissionKeys(userData.permissions);
    localStorage.setItem("permissions", JSON.stringify(permissions));
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("nova_role", JSON.stringify(resolveRoleValue(userData)));

    setUser((prevUser) => {
      const previous = isObject(prevUser) ? prevUser : {};
      const accessToken =
        tokenOverride ||
        previous?.access_token ||
        localStorage.getItem("access_token");

      return {
        ...previous,
        ...userData,
        ...(accessToken ? { access_token: accessToken } : {}),
      };
    });
  }, []);

  const storeDataInLocalStorage = useCallback(
    (response) => {
      const { expires_in, token, user: userData } = resolveAuthPayload(response);

      if (token) {
        localStorage.setItem("access_token", token);
      }

      if (expires_in !== undefined && expires_in !== null) {
        localStorage.setItem("expire", String(expires_in));
      } else {
        localStorage.removeItem("expire");
      }

      if (userData) {
        applyUserData(userData, token || null);
      } else if (token) {
        setUser((prevUser) => ({
          ...(isObject(prevUser) ? prevUser : {}),
          access_token: token,
        }));
      }
    },
    [applyUserData],
  );

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      return { isError: true, error: new Error("No access token found") };
    }

    try {
      const response = await request({
        url: "me",
        method: "GET",
      });

      const currentUser = resolveUserPayload(response);
      if (currentUser) {
        applyUserData(currentUser, token);
      }

      return { isError: false, response, user: currentUser };
    } catch (error) {
      if (error?.response?.status === 401) {
        removeDataInLocalStorage();
      }
      return { isError: true, error };
    }
  }, [applyUserData, removeDataInLocalStorage]);

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      const token = localStorage.getItem("access_token");
      const parsedUser = getStoredUser();

      if (token && isMounted) {
        setUser({ ...(parsedUser || {}), access_token: token });
      }

      if (token) {
        await refreshUser();
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, [getStoredUser, refreshUser]);

  const verifyOTP = async (code) => {
    const formData = new FormData();
    formData.append("code", code);
    formData.append("email", localStorage.getItem("email"));
    try {
      const response = await request({
        url: "verify-login",
        method: "POST",
        data: formData,
      });
      storeDataInLocalStorage(response);
      await refreshUser();
      return { isError: false, response: response };
    } catch (error) {
      return { isError: true, error: error };
    }
  };

  const getOTP = async () => {
    try {
      const response = await request({
        url: "get-otp",
        method: "GET",
      });
      return { isError: false, response: response };
    } catch (error) {
      return { isError: true, error: error };
    }
  };

  const login = async (email, password) => {
    localStorage.setItem("email", email);
    let response = [];
    try {
      response = await request({
        url: "login",
        method: "POST",
        data: {
          email,
          password,
        },
      });
      storeDataInLocalStorage(response);
      await refreshUser();
      return { isError: false, response: response };
    } catch (error) {
      return { isError: true, error: error };
    }
  };

  const loginWithCode = async (email, verificationCode) => {
    localStorage.setItem("email", email);

    try {
      const response = await request({
        url: "login-with-code",
        method: "POST",
        data: {
          email,
          verification_code: verificationCode,
        },
      });
      storeDataInLocalStorage(response);
      await refreshUser();
      return { isError: false, response };
    } catch (error) {
      return { isError: true, error };
    }
  };

  const signup = async (payload) => {
    const signupPayload = {
      name: payload?.name || "",
      email: payload?.email || "",
      phone: payload?.phone || "",
      password: payload?.password || "",
      password_confirmation: payload?.password_confirmation || "",
      verification_code: payload?.verification_code || "",
      referral_code: payload?.referral_code || "",
    };

    try {
      const response = await request({
        url: "signup",
        method: "POST",
        data: signupPayload,
      });
      return { isError: false, response };
    } catch (error) {
      return { isError: true, error };
    }
  };

  const sendVerificationCode = async (email) => {
    localStorage.setItem("email", email);
    try {
      const response = await request({
        url: "send-verification-code",
        method: "POST",
        data: {
          email,
        },
      });
      return { isError: false, response };
    } catch (error) {
      return { isError: true, error };
    }
  };

  const logoutUser = async () => {
    let token = localStorage.getItem("access_token");
    let formData = new FormData();
    formData.append("token", token);
    try {
      await request({
        url: "logout",
        method: "POST",
        data: formData
      });
    } catch (err) { }
  };

  const logout = () => {
    logoutUser();
    removeDataInLocalStorage();
  };

  const isAuthenticated = () => {
    return Boolean(user?.access_token || localStorage.getItem("access_token"));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        loginWithCode,
        signup,
        sendVerificationCode,
        logout,
        loading,
        verifyOTP,
        getOTP,
        isAuthenticated,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
