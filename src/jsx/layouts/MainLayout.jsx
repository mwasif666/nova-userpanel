import { useContext } from "react";
import { Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import Nav from "./nav";
import Footer from "./Footer";
import { ThemeContext } from "../../context/ThemeContext";

const MainLayout = () => {
  const { sidebariconHover, sidwallateBar } = useContext(ThemeContext);
  const sideMenu = useSelector((state) => state.sideMenu);

  return (
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
  );
};

export default MainLayout;
