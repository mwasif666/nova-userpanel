import React, { useContext } from "react";
/// React router dom
import { Link } from "react-router-dom";
import { ThemeContext } from "../../../context/ThemeContext";
import { navtoggle } from "../../../store/actions/AuthActions";
import { useDispatch, useSelector } from "react-redux";


const NavHader = ({nvhader, openSidebar}) => {  
  const {  openMenuToggle, } = useContext(
    ThemeContext
  );
  	const dispatch = useDispatch();
    const sideMenu = useSelector(state => state.sideMenu);
    const handleToogle = () => {
      dispatch(navtoggle());
    };	
  return (
    <div className="nav-header">
      <Link to="/" className="brand-logo">
        {nvhader === "first" ? (
          <div className="brand-title">
            <img
              src="/logo-new.webp"
              alt="Nova"
              style={{ height: "34px", objectFit: "contain", maxWidth: "140px", filter: "brightness(0) invert(1)" }}
            />
          </div>
        ) : (
          <img
            src="/logo-new.webp"
            alt="Nova"
            className="logo-abbr"
            style={{ width: "38px", height: "38px", objectFit: "contain", filter: "brightness(0) invert(1)" }}
          />
        )}
      </Link>

      <div
        className="nav-control"
        onClick={() => {
			handleToogle()
		  	openMenuToggle();        
        }}
      >
        <div className={`hamburger ${sideMenu ? "is-active" : ""} ${openSidebar ? 'd-none' : ''}` } >
          <span className="line"></span>
          <span className="line"></span>
          <span className="line"></span>
		  	<svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
				<rect x="22" y="11" width="4" height="4" rx="2" fill="#2A353A"/>
				<rect x="11" width="4" height="4" rx="2" fill="#2A353A"/>
				<rect x="22" width="4" height="4" rx="2" fill="#2A353A"/>
				<rect x="11" y="11" width="4" height="4" rx="2" fill="#2A353A"/>
				<rect x="11" y="22" width="4" height="4" rx="2" fill="#2A353A"/>
				<rect width="4" height="4" rx="2" fill="#2A353A"/>
				<rect y="11" width="4" height="4" rx="2" fill="#2A353A"/>
				<rect x="22" y="22" width="4" height="4" rx="2" fill="#2A353A"/>
				<rect y="22" width="4" height="4" rx="2" fill="#2A353A"/>
			</svg>
        </div>
      </div>
    </div>
  );
};

export default NavHader;
