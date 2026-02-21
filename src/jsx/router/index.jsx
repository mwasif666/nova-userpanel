import React, { useContext } from "react";
import { Routes, Route, Outlet } from "react-router-dom";
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

/// Admin pages
import Index3 from "../pages/dashboard/Index3";
import Home from "../pages/dashboard/Home";
import KycAll from "../pages/admin/KycAll";
import Cards from "../pages/admin/Cards";
import Transactions from "../pages/admin/Transactions";
import Subscribers from "../pages/admin/Subscribers";
import Invites from "../pages/admin/Invites";
import Profile from "../pages/admin/Profile";

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
          {/* <Route path="/index-3" element={<Index3 />} /> */}
          <Route path="/" element={<Home />} />
          <Route path="/kyc" element={<KycAll />} />
          {/* <Route path="/kyc-submitted" element={<KycSubmitted />} />
          <Route path="/kyc-pending" element={<KycPending />} />
          <Route path="/kyc-approved" element={<KycApproved />} />
          <Route path="/kyc-rejected" element={<KycRejected />} /> */}
          <Route path="/cards" element={<Cards />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/subscribers" element={<Subscribers />} />
          <Route path="/invites" element={<Invites />} />
          <Route path="/profile" element={<Profile />} />
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
