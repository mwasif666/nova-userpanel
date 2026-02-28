import React, { useReducer, useContext, useEffect, useState } from "react";
import { Collapse } from "react-bootstrap";
/// Link
import { Link, useNavigate } from "react-router-dom";
import { MenuList } from "./Menu";

import { useScrollPosition } from "@n8tb1t/use-scroll-position";
import { ThemeContext } from "../../../context/ThemeContext";
import { AuthContext } from "../../../context/authContext";

const reducer = (previousState, updatedState) => ({
  ...previousState,
  ...updatedState,
});

const initialState = {
  active: "",
  activeSubmenu: "",
};

const SideBar = () => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const {
    iconHover,
    sidebarposition,
    headerposition,
    sidebarLayout,
    ChangeIconSidebar,
  } = useContext(ThemeContext);

  const [state, setState] = useReducer(reducer, initialState);

  const [hideOnScroll, setHideOnScroll] = useState(true);
  useScrollPosition(
    ({ prevPos, currPos }) => {
      const isShow = currPos.y > prevPos.y;
      if (isShow !== hideOnScroll) setHideOnScroll(isShow);
    },
    [hideOnScroll],
  );

  const handleMenuActive = (status) => {
    setState({ active: status });
    if (state.active === status) {
      setState({ active: "" });
    }
  };
  const handleSubmenuActive = (status) => {
    setState({ activeSubmenu: status });
    if (state.activeSubmenu === status) {
      setState({ activeSubmenu: "" });
    }
  };

  /// Path
  let path = window.location.pathname;
  path = path.split("/");
  path = path[path.length - 1];
  const normalizePath = (value) => (value || "").replace(/^\//, "");

  useEffect(() => {
    MenuList.forEach((data) => {
      data.content?.forEach((item) => {
        if (path === normalizePath(item.to)) {
          setState({ active: data.title });
        }
        item.content?.forEach((ele) => {
          if (path === normalizePath(ele.to)) {
            setState({ activeSubmenu: item.title, active: data.title });
          }
        });
      });
    });
  }, [path]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div
      onMouseEnter={() => ChangeIconSidebar(true)}
      onMouseLeave={() => ChangeIconSidebar(false)}
      className={`deznav ${iconHover} ${
        sidebarposition.value === "fixed" &&
        sidebarLayout.value === "horizontal" &&
        headerposition.value === "static"
          ? hideOnScroll > 120
            ? "fixed"
            : ""
          : ""
      }`}
    >
      <div className="deznav-scroll">
        <ul className="metismenu nova-sidebar-main-menu" id="menu">
          {MenuList.map((data, index) => {
            let menuClass = data.classsChange;
            if (menuClass === "menu-title") {
              return (
                <li
                  className={`nav-label ${menuClass} ${data.extraclass}`}
                  key={index}
                >
                  {data.title}
                </li>
              );
            } else {
              return (
                <li
                  className={` ${state.active === data.title ? "mm-active" : ""}${normalizePath(data.to) === path ? "mm-active" : ""}`}
                  key={index}
                >
                  {data.content && data.content.length > 0 ? (
                    <>
                      <Link
                        to={"#"}
                        className="has-arrow"
                        onClick={() => {
                          handleMenuActive(data.title);
                        }}
                      >
                        <div className="menu-icon">{data.iconStyle}</div>
                        <span className="nav-text">{data.title}</span>
                        <span className="badge badge-xs style-1 badge-danger">
                          {data.update}
                        </span>
                      </Link>
                      <Collapse in={state.active === data.title ? true : false}>
                        <ul
                          className={`${menuClass === "mm-collapse" ? "mm-show" : ""}`}
                        >
                          {data.content &&
                            data.content.map((data, index) => {
                              return (
                                <li
                                  key={index}
                                  className={`${state.activeSubmenu === data.title ? "mm-active" : ""}${normalizePath(data.to) === path ? "mm-active" : ""}`}
                                >
                                  {data.content && data.content.length > 0 ? (
                                    <>
                                      <Link
                                        to={data.to}
                                        className={
                                          data.hasMenu ? "has-arrow" : ""
                                        }
                                        onClick={() => {
                                          handleSubmenuActive(data.title);
                                        }}
                                      >
                                        {data.title}
                                      </Link>
                                      <Collapse
                                        in={
                                          state.activeSubmenu === data.title
                                            ? true
                                            : false
                                        }
                                      >
                                        <ul
                                          className={`${menuClass === "mm-collapse" ? "mm-show" : ""}`}
                                        >
                                          {data.content &&
                                            data.content.map((data, index) => {
                                              return (
                                                <li key={index}>
                                                  <Link
                                                    className={`${path === normalizePath(data.to) ? "mm-active" : ""}`}
                                                    to={data.to}
                                                  >
                                                    {data.title}
                                                  </Link>
                                                </li>
                                              );
                                            })}
                                        </ul>
                                      </Collapse>
                                    </>
                                  ) : (
                                    <Link
                                      to={data.to}
                                      className={`${normalizePath(data.to) === path ? "mm-active" : ""}`}
                                    >
                                      {data.title}
                                    </Link>
                                  )}
                                </li>
                              );
                            })}
                        </ul>
                      </Collapse>
                    </>
                  ) : (
                    <Link
                      to={data.to}
                      className={`${data.to === path ? "mm-active" : ""}`}
                    >
                      {data.iconStyle}
                      <span className="nav-text">{data.title}</span>
                    </Link>
                  )}
                </li>
              );
            }
          })}
          <li className="nova-sidebar-logout-item">
            <Link
              to="#"
              onClick={(event) => {
                event.preventDefault();
                handleLogout();
              }}
            >
              <svg
                id="icon-logout"
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="feather feather-log-out"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span className="nav-text">Logout</span>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default SideBar;
