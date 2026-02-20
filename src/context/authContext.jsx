import { createContext, useState, useEffect } from "react";
import { request } from "../utils/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const userData = localStorage.getItem("user");
    let parsedUser = null;

    if (userData) {
      try {
        parsedUser = JSON.parse(userData);
      } catch (error) {
        parsedUser = null;
      }
    }

    if (token) {
      setUser({ access_token: token, ...(parsedUser || {}) });
    }

    setLoading(false);
  }, []);

  const storeDataInLocalStorage = (response) => {
    const { expires_in, token, user } = response;
    /** Permission Scenario */
    const permissions = Array.isArray(user?.permissions) ? user.permissions.map((p) => p.key) : [];
    localStorage.setItem("permissions", JSON.stringify(permissions));

    /** token Scenario */
    if (token) localStorage.setItem("access_token", token);

    /** Store User*/
    if (user) localStorage.setItem("user", JSON.stringify(user));

    localStorage.setItem("nova_role", JSON.stringify(user?.role ?? null));
    if (expires_in !== undefined && expires_in !== null) {
      localStorage.setItem("expire", expires_in);
    } else {
      localStorage.removeItem("expire");
    }

    if (token || user) {
      setUser({
        ...(user || {}),
        ...(token ? { access_token: token } : {}),
      });
    }
  };

  const removeDataInLocalStorage = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("permissions");
    localStorage.removeItem("expire");
    localStorage.removeItem("nova_role");
    localStorage.removeItem("email");
    setUser(null);
  };

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
      storeDataInLocalStorage(response.data);
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
    const resolveAuthPayload = (response) => {
      if (!response || typeof response !== "object") return null;
      if (response?.data && typeof response.data === "object") {
        if (response.data?.token || response.data?.user) return response.data;
      }
      if (response?.token || response?.user) return response;
      return null;
    };

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

      const authPayload = resolveAuthPayload(response);
      if (authPayload) {
        storeDataInLocalStorage(authPayload);
      }

      return { isError: false, response: response };
    } catch (error) {
      return { isError: true, error: error };
    }
  };

  const loginWithCode = async (email, verificationCode) => {
    localStorage.setItem("email", email);

    const resolveAuthPayload = (response) => {
      if (!response || typeof response !== "object") return null;
      if (response?.data && typeof response.data === "object") {
        if (response.data?.token || response.data?.user) return response.data;
      }
      if (response?.token || response?.user) return response;
      return null;
    };

    try {
      const response = await request({
        url: "login-with-code",
        method: "POST",
        data: {
          email,
          verification_code: verificationCode,
        },
      });

      const authPayload = resolveAuthPayload(response);
      if (authPayload) {
        storeDataInLocalStorage(authPayload);
      }

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
    let token =  localStorage.getItem("access_token");
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
    return user && user.access_token;
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
