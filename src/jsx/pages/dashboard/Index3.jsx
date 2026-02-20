import React, { useContext, useEffect } from "react";
import Dashboard from "../admin/Dashboard";
import { ThemeContext } from "../../../context/ThemeContext";

const Index3 = () => {
  const { setHeaderIcon } = useContext(ThemeContext);
  useEffect(() => {
    setHeaderIcon(true);
  }, [setHeaderIcon]);
  return (
    <>
      <Dashboard />
    </>
  );
};

export default Index3;
