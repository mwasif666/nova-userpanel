import React, { useContext } from "react";
import { Routes, Route, Outlet, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

/// Css
import "./../index.css";
import "./../chart.css";
import "./../step.css";

/// Layout
import Nav from "./../layouts/nav";
import Footer from "./../layouts/Footer";
import { ThemeContext } from "../../context/ThemeContext";

// Scroll To Top
import ScrollToTop from "./../layouts/ScrollToTop";

/// User pages
import Home from "../pages/dashboard/Home";
import Kyc from "../pages/user/Kyc";
import Cards from "../pages/user/Cards";
import SecuritySettings from "../pages/user/SecuritySettings";

/// Error pages
import LockScreen from "./../pages/error/LockScreen";
import Error400 from "./../pages/error/Error400";
import Error403 from "./../pages/error/Error403";
import Error404 from "./../pages/error/Error404";
import Error500 from "./../pages/error/Error500";
import Error503 from "./../pages/error/Error503";

const Markup = () => {
  return (
    <>
      <Routes>
        <Route path="/page-lock-screen/" element={<LockScreen />} />
        <Route path="/page-error-400" element={<Error400 />} />
        <Route path="/page-error-403" element={<Error403 />} />
        <Route path="/page-error-404" element={<Error404 />} />
        <Route path="/page-error-500" element={<Error500 />} />
        <Route path="/page-error-503" element={<Error503 />} />
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/kyc" element={<Kyc />} />
          <Route path="/cards" element={<Cards />} />
          <Route path="/security-settings" element={<SecuritySettings />} />
          <Route path="/profile" element={<SecuritySettings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <ScrollToTop />
    </>
  );
};

function MainLayout() {
  const { sidebariconHover, sidwallateBar } = useContext(ThemeContext);
  const sideMenu = useSelector((state) => state.sideMenu);

  return (
    <>
      <div
        id="main-wrapper"
        className={`show wallet-open ${sidwallateBar ? "false" : ""} ${
          sidebariconHover ? "iconhover-toggle" : ""
        } ${sideMenu ? "menu-toggle" : ""}`}
      >
        <Nav />
        <div className="content-body">
          <div className="container-fluid pt-0">
            <Outlet />
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
}

export default Markup;
